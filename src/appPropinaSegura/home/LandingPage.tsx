
import FeaturesPage from "../features/FeaturesPage"
import HeroPage from "../hero/HeroPage"
import Seo from "@/components/Seo"

const LandingPage = () => {
    const canonicalUrl = "https://repartejusto.com/"
    const title = "ReparteJusto | Reparto transparente de propinas"
    const description =
        "Registra asistencia, define ponderaciones y liquida propinas con trazabilidad para sala y cocina. Transparencia total para tu equipo."

    return (
        <>
            <Seo
                title={title}
                description={description}
                canonicalUrl={canonicalUrl}
                ogImage="https://repartejusto.com/og-image.png"
                siteName="ReparteJusto"
                jsonLd={[
                    {
                        "@context": "https://schema.org",
                        "@type": "SoftwareApplication",
                        name: "ReparteJusto",
                        applicationCategory: "FinanceApplication",
                        operatingSystem: "Web",
                        url: canonicalUrl,
                        inLanguage: "es",
                        description,
                        offers: {
                            "@type": "Offer",
                            price: "0",
                            priceCurrency: "USD",
                            category: "FreeTrial",
                        },
                        publisher: {
                            "@type": "Organization",
                            name: "ReparteJusto",
                            url: canonicalUrl,
                        },
                    },
                    {
                        "@context": "https://schema.org",
                        "@type": "Organization",
                        name: "ReparteJusto",
                        url: canonicalUrl,
                    },
                ]}
            />
            <HeroPage />
            <FeaturesPage />
        </>
    )
}

export default LandingPage
