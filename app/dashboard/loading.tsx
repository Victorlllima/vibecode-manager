import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

export default function DashboardLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-48" /> {/* Título */}
                <Skeleton className="h-10 w-32" /> {/* Botão */}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="flex flex-col h-full">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                    <Skeleton className="h-6 w-32" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                                <Skeleton className="h-8 w-8 rounded-full" />
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 pb-3 space-y-4">
                            <Skeleton className="h-4 w-full" />
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <Skeleton className="h-3 w-12" />
                                    <Skeleton className="h-3 w-8" />
                                </div>
                                <Skeleton className="h-2 w-full" />
                            </div>
                        </CardContent>
                        <CardFooter className="pt-3 border-t">
                            <Skeleton className="h-4 w-24" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    )
}
