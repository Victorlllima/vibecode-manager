export default function DashboardLoading() {
    return (
        <div>
            {/* Header Skeleton */}
            <div className="flex items-center justify-between mb-8">
                <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
                <div className="h-10 w-36 bg-gray-800 rounded animate-pulse" />
            </div>

            {/* Grid de Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="bg-dark-card/50 rounded-lg border border-gray-800 p-5"
                    >
                        {/* Título */}
                        <div className="h-6 w-3/4 bg-gray-800 rounded mb-3 animate-pulse" />

                        {/* Repo */}
                        <div className="h-4 w-1/2 bg-gray-800 rounded mb-4 animate-pulse" />

                        {/* Barra de progresso */}
                        <div className="mb-4">
                            <div className="flex justify-between mb-2">
                                <div className="h-4 w-20 bg-gray-800 rounded animate-pulse" />
                                <div className="h-4 w-10 bg-gray-800 rounded animate-pulse" />
                            </div>
                            <div className="h-2 w-full bg-gray-800 rounded animate-pulse" />
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between">
                            <div className="h-4 w-24 bg-gray-800 rounded animate-pulse" />
                            <div className="h-6 w-16 bg-gray-800 rounded animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
