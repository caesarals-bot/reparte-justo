const LoadingScreen = () => {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
                <div className="h-3 w-3 animate-pulse rounded-full bg-primary" aria-hidden="true" />
                <div className="h-3 w-3 animate-pulse rounded-full bg-primary/80" aria-hidden="true" />
                <div className="h-3 w-3 animate-pulse rounded-full bg-primary/60" aria-hidden="true" />
                <span className="text-sm font-medium text-muted-foreground">Cargando…</span>
            </div>
        </div>
    )
}

export default LoadingScreen
