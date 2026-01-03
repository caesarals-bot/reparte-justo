import { useState } from 'react'
import { Search, HelpCircle, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Share2 } from 'lucide-react'
import { useFAQs, useFAQSearch, useFAQCategories } from '@/hooks/useFAQs'
import { useFAQAnalytics } from '@/hooks/useFAQs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { FAQ } from '@/types/faq'

export function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const { faqs, loading, error } = useFAQs(
    selectedCategory ? { category: selectedCategory } : undefined
  )
  const { results, search, loading: searchLoading } = useFAQSearch()
  const { categories } = useFAQCategories()

  const displayFAQs = searchQuery ? results : faqs
  const isLoading = searchQuery ? searchLoading : loading

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setSelectedCategory(null) // Clear category when searching
    search(query)
  }

  const handleShare = async (faq: FAQ) => {
    const url = `${window.location.origin}/faq#${faq.id}`
    if (navigator.share) {
      await navigator.share({
        title: faq.question,
        text: faq.answer,
        url: url
      })
    } else {
      await navigator.clipboard.writeText(url)
      // Show toast or notification
    }
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-600">Error loading FAQs: {error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Preguntas Frecuentes</h1>
        <p className="text-muted-foreground mb-6">
          Encuentra respuestas a las preguntas más comunes sobre ReparteJusto
        </p>
        
        {/* Search Bar */}
        <div className="relative max-w-md mx-auto mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar preguntas..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 justify-center">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedCategory(null)
              setSearchQuery('')
            }}
          >
            Todas
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedCategory(category.id)
                setSearchQuery('')
              }}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando preguntas...</p>
        </div>
      )}

      {/* FAQ List */}
      {!isLoading && displayFAQs.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? 'No se encontraron resultados' : 'No hay preguntas disponibles'}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery 
                ? 'Intenta con otros términos de búsqueda'
                : 'Pronto tendremos preguntas frecuentes disponibles'
              }
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {displayFAQs.map((faq) => (
          <FAQItem
            key={faq.id}
            faq={faq}
            isExpanded={expandedItems.has(faq.id)}
            onToggleExpand={() => toggleExpanded(faq.id)}
            onShare={() => handleShare(faq)}
            categories={categories}
          />
        ))}
      </div>

      {/* Contact CTA */}
      {!isLoading && displayFAQs.length > 0 && (
        <Card className="mt-8 bg-muted/50">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">¿No encontraste lo que buscabas?</h3>
            <p className="text-muted-foreground mb-4">
              Estamos aquí para ayudarte. Contáctanos directamente.
            </p>
            <Button>Contactar Soporte</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface FAQItemProps {
  faq: FAQ
  isExpanded: boolean
  onToggleExpand: () => void
  onShare: () => void
  categories: Array<{ id: string; name: string; color: string }>
}

function FAQItem({ faq, isExpanded, onToggleExpand, onShare, categories }: FAQItemProps) {
  const { markViewed, markHelpful } = useFAQAnalytics(faq.id)
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null)

  const handleExpand = () => {
    if (!isExpanded) {
      markViewed() // Track view when expanding
    }
    onToggleExpand()
  }

  const handleFeedback = async (helpful: boolean) => {
    if (feedbackGiven !== null) return // Already gave feedback
    
    try {
      await markHelpful(helpful)
      setFeedbackGiven(helpful)
    } catch (error) {
      console.error('Error submitting feedback:', error)
    }
  }

  const categoryBadge = categories.find((cat: { id: string; name: string; color: string }) => cat.id === faq.category)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{faq.question}</CardTitle>
            <div className="flex items-center gap-2">
              {categoryBadge && (
                <Badge variant="secondary" style={{ backgroundColor: categoryBadge.color }}>
                  {categoryBadge.name}
                </Badge>
              )}
              {faq.tags.length > 0 && (
                <div className="flex gap-1">
                  {faq.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onShare}
              className="shrink-0"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExpand}
              className="shrink-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="prose max-w-none">
            <div 
              className="text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: faq.answer }}
            />
          </div>
          
          {/* Feedback Section */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              ¿Esta respuesta fue útil?
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant={feedbackGiven === true ? "default" : "outline"}
                size="sm"
                onClick={() => handleFeedback(true)}
                disabled={feedbackGiven !== null}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                Sí
              </Button>
              <Button
                variant={feedbackGiven === false ? "default" : "outline"}
                size="sm"
                onClick={() => handleFeedback(false)}
                disabled={feedbackGiven !== null}
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                No
              </Button>
              {feedbackGiven !== null && (
                <span className="text-sm text-muted-foreground ml-2">
                  ¡Gracias por tu feedback!
                </span>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
