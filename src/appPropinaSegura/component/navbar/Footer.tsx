const Footer = () => {
    return (
        <footer className="border-t bg-background/80 py-10">
            <div className="container mx-auto flex flex-col items-center gap-4 px-4 text-center sm:flex-row sm:justify-between sm:text-left">
                <p className="text-sm text-muted-foreground">
                    © 2025 ReparteJusto. Todos los derechos reservados.
                </p>
                <div className="flex gap-3 text-sm text-muted-foreground">
                    <a
                        href="#features"
                        className="transition hover:text-primary"
                        aria-label="Ir a características"
                        tabIndex={0}
                    >
                        Características
                    </a>
                    <a
                        href="#contact"
                        className="transition hover:text-primary"
                        aria-label="Contactar con ReparteJusto"
                        tabIndex={0}
                    >
                        Contacto
                    </a>
                </div>
            </div>
        </footer>
    )
}

export default Footer
