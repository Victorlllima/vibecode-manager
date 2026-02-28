#!/usr/bin/env python3
"""
RVM Heartbeat Daemon v2
Monitora o sistema a cada 15 minutos e reporta para a API.
Roda como processo contínuo — use pm2 ou systemd para manter ativo.

Usage:
  python3 heartbeat-v2.py              # roda forever (intervalo padrão: 15min)
  python3 heartbeat-v2.py --once       # roda uma vez e sai
  python3 heartbeat-v2.py --interval 5 # intervalo em minutos
"""

import os
import sys
import time
import json
import signal
import argparse
import platform
import subprocess
import urllib.request
import urllib.error
from datetime import datetime

# ──────────────────────────────────────────────
# Configuração
# ──────────────────────────────────────────────
API_URL = os.environ.get('RVM_API_URL', 'http://localhost:4000')
DEFAULT_INTERVAL_MIN = int(os.environ.get('HEARTBEAT_INTERVAL', '15'))

running = True

def signal_handler(sig, frame):
    global running
    print(f'\n[heartbeat] Sinal {sig} recebido — encerrando...')
    running = False

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# ──────────────────────────────────────────────
# Coleta de métricas
# ──────────────────────────────────────────────

def get_system_load():
    """Retorna load average (1min) normalizado por núcleos"""
    try:
        if platform.system() == 'Windows':
            # Windows não tem load average — usa CPU percent via wmic
            result = subprocess.run(
                ['wmic', 'cpu', 'get', 'loadpercentage'],
                capture_output=True, text=True, timeout=5
            )
            lines = [l.strip() for l in result.stdout.strip().split('\n') if l.strip().isdigit()]
            return round(float(lines[0]) / 100, 2) if lines else 0.0
        else:
            load1 = os.getloadavg()[0]
            cpu_count = os.cpu_count() or 1
            return round(load1 / cpu_count, 2)
    except Exception:
        return 0.0

def get_api_status():
    """Verifica se a API Express está respondendo"""
    try:
        req = urllib.request.Request(
            f'{API_URL}/health',
            headers={'Accept': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            return data.get('status') == 'ok'
    except Exception:
        return False

def get_pending_tasks_count():
    """Conta tasks pendentes via API"""
    try:
        req = urllib.request.Request(
            f'{API_URL}/api/tasks',
            headers={'Accept': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            tasks = json.loads(resp.read().decode())
            pending = [t for t in tasks if t.get('status') in ('pending', 'in_progress')]
            return len(pending)
    except Exception:
        return -1

def collect_metrics():
    """Coleta todas as métricas do sistema"""
    system_load = get_system_load()
    api_ok = get_api_status()
    pending_tasks = get_pending_tasks_count()

    # Determina status geral
    if not api_ok:
        status = 'error'
    elif system_load > 2.0:
        status = 'warning'
    else:
        status = 'ok'

    logs = {
        'api_responding': api_ok,
        'pending_tasks': pending_tasks,
        'platform': platform.system(),
        'python': platform.python_version(),
        'timestamp_local': datetime.now().isoformat(),
    }

    return {
        'status': status,
        'tasks_processed': max(0, pending_tasks),
        'system_load': system_load,
        'logs': json.dumps(logs),
    }

# ──────────────────────────────────────────────
# Envio para API
# ──────────────────────────────────────────────

def send_heartbeat(metrics):
    """Envia heartbeat para a API Express"""
    payload = json.dumps(metrics).encode('utf-8')
    req = urllib.request.Request(
        f'{API_URL}/api/heartbeat',
        data=payload,
        headers={
            'Content-Type': 'application/json',
            'Content-Length': str(len(payload)),
        },
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode())

def run_once():
    """Executa um ciclo de heartbeat"""
    print(f'[heartbeat] {datetime.now().strftime("%Y-%m-%d %H:%M:%S")} — coletando métricas...')

    try:
        metrics = collect_metrics()
        result = send_heartbeat(metrics)
        print(f'[heartbeat] ✅ status={metrics["status"]} load={metrics["system_load"]} tasks={metrics["tasks_processed"]} id={result.get("id","?")}')
        return True
    except urllib.error.URLError as e:
        print(f'[heartbeat] ❌ API indisponível: {e.reason}')
        return False
    except Exception as e:
        print(f'[heartbeat] ❌ Erro: {e}')
        return False

# ──────────────────────────────────────────────
# Self-healing básico
# ──────────────────────────────────────────────

consecutive_failures = 0
MAX_FAILURES_BEFORE_ALERT = 2

def check_and_heal(success):
    """Rastreia falhas consecutivas — API pode alertar via Telegram"""
    global consecutive_failures
    if success:
        consecutive_failures = 0
    else:
        consecutive_failures += 1
        if consecutive_failures >= MAX_FAILURES_BEFORE_ALERT:
            print(f'[heartbeat] ⚠️  {consecutive_failures} falhas consecutivas — API pode estar down')
            # Tenta notificar diretamente via Telegram se API estiver fora
            try:
                import os
                token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
                chat_id = os.environ.get('TELEGRAM_CHAT_ID', '')
                if token and chat_id:
                    import urllib.parse
                    msg = urllib.parse.quote(f'🚨 Heartbeat falhou {consecutive_failures}x consecutivas. API pode estar down.')
                    tg_url = f'https://api.telegram.org/bot{token}/sendMessage?chat_id={chat_id}&text={msg}'
                    urllib.request.urlopen(tg_url, timeout=5)
                    print('[heartbeat] ⚠️  Alerta enviado via Telegram')
            except Exception:
                pass

# ──────────────────────────────────────────────
# Main loop
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='RVM Heartbeat Daemon')
    parser.add_argument('--once', action='store_true', help='Roda uma vez e sai')
    parser.add_argument('--interval', type=int, default=DEFAULT_INTERVAL_MIN, help='Intervalo em minutos (padrão: 15)')
    args = parser.parse_args()

    interval_sec = args.interval * 60

    print(f'🫀 RVM Heartbeat Daemon v2')
    print(f'   API: {API_URL}')
    print(f'   Intervalo: {args.interval} minutos')
    print(f'   Modo: {"uma vez" if args.once else "contínuo"}')
    print()

    if args.once:
        success = run_once()
        sys.exit(0 if success else 1)

    # Loop contínuo
    while running:
        success = run_once()
        check_and_heal(success)

        if not running:
            break

        print(f'[heartbeat] próximo ciclo em {args.interval}min...')
        # Sleep em chunks para responder rápido ao SIGTERM
        for _ in range(interval_sec):
            if not running:
                break
            time.sleep(1)

    print('[heartbeat] Daemon encerrado.')

if __name__ == '__main__':
    main()
