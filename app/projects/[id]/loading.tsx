import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

export default function ProjectLoading() {
    return (
        <div className="container max-w-6xl mx-auto py-8 space-y-8">
            {/* Header Skeleton */}
            <div className="space-y-4">
                <Skeleton className="h-4 w-32" />
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-64" />
                        <div className="flex gap-4">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-6 w-24" />
                    </div>
                </div>
            </div>

            <Separator />

            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-24 w-full rounded-lg" /> {/* Next Action */}
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-[400px] w-full rounded-lg" /> {/* Notes */}
                    <Skeleton className="h-40 w-full rounded-lg" /> {/* Actions */}
                </div>
            </div>
        </div>
    )
}
