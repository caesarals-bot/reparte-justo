import { useState } from 'react'
import { Plus, Search, Edit, Trash2, Eye, EyeOff, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useFAQAdmin } from '@/hooks/useFAQAdmin'
import { useFAQCategoriesAdmin } from '@/hooks/useFAQAdmin'
import { FAQForm } from './FAQForm'
import type { FAQ, FAQFormData } from '@/types/faq'

export function FAQManagement() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFAQ, setSelectedFAQ] = useState<FAQ | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [sortField, setSortField] = useState<'order' | 'question' | 'views' | 'helpful'>('order')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const { faqs, loading, error, createFAQ, updateFAQ, deleteFAQ, toggleStatus } = useFAQAdmin()
  const { categories } = useFAQCategoriesAdmin()

  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const sortedFAQs = [...filteredFAQs].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    }
    
    return 0
  })

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleCreateNew = () => {
    setSelectedFAQ(null)
    setIsFormOpen(true)
  }

  const handleEdit = (faq: FAQ) => {
    setSelectedFAQ(faq)
    setIsFormOpen(true)
  }

  const handleSave = async (formData: FAQFormData) => {
    try {
      if (selectedFAQ) {
        await updateFAQ(selectedFAQ.id, formData)
      } else {
        // Add required fields for createFAQ
        const newFAQ = {
          ...formData,
          views: 0,
          helpful: 0,
          notHelpful: 0,
          createdBy: 'current-user', // TODO: Get from auth context
          updatedBy: 'current-user', // TODO: Get from auth context
        }
        await createFAQ(newFAQ)
      }
      setIsFormOpen(false)
      setSelectedFAQ(null)
    } catch (error) {
      console.error('Error saving FAQ:', error)
    }
  }

  const handleDelete = async (faq: FAQ) => {
    if (window.confirm(`¿Estás seguro de eliminar la pregunta: "${faq.question}"?`)) {
      try {
        await deleteFAQ(faq.id)
      } catch (error) {
        console.error('Error deleting FAQ:', error)
      }
    }
  }

  const handleToggleStatus = async (faq: FAQ) => {
    try {
      await toggleStatus(faq.id, !faq.isActive)
    } catch (error) {
      console.error('Error toggling FAQ status:', error)
    }
  }

  const getCategoryName = (categoryId: string) => {
    return categories.find((cat: { id: string; name: string; color: string }) => cat.id === categoryId)?.name || 'Sin categoría'
  }

  const getCategoryColor = (categoryId: string) => {
    return categories.find((cat: { id: string; name: string; color: string }) => cat.id === categoryId)?.color || '#gray'
  }

  if (isFormOpen) {
    return (
      <FAQForm
        faq={selectedFAQ || undefined}
        onSave={handleSave}
        onCancel={() => {
          setIsFormOpen(false)
          setSelectedFAQ(null)
        }}
      />
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gestión de FAQs</CardTitle>
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva FAQ
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Cargando FAQs...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <p className="text-red-600">Error: {error}</p>
            </div>
          )}

          {/* FAQ Table */}
          {!loading && !error && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('order')}
                    >
                      <div className="flex items-center gap-1">
                        Orden
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('question')}
                    >
                      <div className="flex items-center gap-1">
                        Pregunta
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('views')}
                    >
                      <div className="flex items-center gap-1">
                        Vistas
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('helpful')}
                    >
                      <div className="flex items-center gap-1">
                        Útiles
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFAQs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        {searchQuery ? 'No se encontraron resultados' : 'No hay FAQs creadas'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedFAQs.map((faq) => (
                      <TableRow key={faq.id}>
                        <TableCell>{faq.order}</TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate font-medium">
                            {faq.question}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            style={{ backgroundColor: getCategoryColor(faq.category) }}
                          >
                            {getCategoryName(faq.category)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={faq.isActive ? "default" : "secondary"}>
                            {faq.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>{faq.views}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>✓ {faq.helpful}</div>
                            <div>✗ {faq.notHelpful}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(faq)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(faq)}
                            >
                              {faq.isActive ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(faq)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Summary Stats */}
          {!loading && !error && faqs.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{faqs.length}</div>
                  <div className="text-sm text-muted-foreground">Total FAQs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {faqs.filter(f => f.isActive).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Activas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {faqs.reduce((sum, f) => sum + f.views, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Vistas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {faqs.reduce((sum, f) => sum + f.helpful, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Respuestas Útiles</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
