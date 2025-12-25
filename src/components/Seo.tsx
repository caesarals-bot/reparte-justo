import { useMemo } from "react"

type JsonLd = Record<string, unknown> | Record<string, unknown>[]

type SeoProps = {
    title: string
    description: string
    canonicalUrl?: string
    ogImage?: string
    ogType?: "website" | "article" | "product" | string
    siteName?: string
    twitterHandle?: string
    jsonLd?: JsonLd
    noIndex?: boolean
}

const DEFAULT_SITE_NAME = "ReparteJusto"

const Seo = ({
    title,
    description,
    canonicalUrl,
    ogImage,
    ogType = "website",
    siteName = DEFAULT_SITE_NAME,
    twitterHandle,
    jsonLd,
    noIndex = false,
}: SeoProps) => {
    const serializedJsonLd = useMemo(() => {
        if (!jsonLd) {
            return null
        }

        try {
            return JSON.stringify(jsonLd)
        } catch (error) {
            console.error("Error serializando JSON-LD", error)
            return null
        }
    }, [jsonLd])

    return (
        <>
            <title>{title}</title>
            <meta name="description" content={description} />
            {noIndex && <meta name="robots" content="noindex,nofollow" />}
            {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:type" content={ogType} />
            {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
            {ogImage && <meta property="og:image" content={ogImage} />}
            {siteName && <meta property="og:site_name" content={siteName} />}

            <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            {ogImage && <meta name="twitter:image" content={ogImage} />}
            {twitterHandle && <meta name="twitter:site" content={twitterHandle} />}

            {serializedJsonLd && (
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializedJsonLd }} />
            )}
        </>
    )
}

export default Seo
