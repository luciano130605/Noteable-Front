import { useState, useEffect } from 'react'
import { useNotion } from '../hooks/Usenotion'
import type { NotionPage } from '../hooks/Usenotion'
import { CheckCircle, Loader, X } from 'lucide-react'

interface Props {
    currentPage: { id: string; title: string; url: string } | null
    onSelect: (page: NotionPage | null) => void
    onClose: () => void
}

export default function NotionPagePicker({ currentPage, onSelect, onClose }: Props) {
    const { searchPages, clearPages, pages, searching, error } = useNotion()
    const [query, setQuery] = useState('')

    useEffect(() => {
        searchPages('')
        return () => clearPages()
    }, [])

    const handleSearch = (v: string) => {
        setQuery(v)
        searchPages(v)
    }

    return (
        <div className="notion-picker__overlay" onClick={onClose}>
            <div className="notion-picker" onClick={e => e.stopPropagation()}>

                <div className="notion-picker__header">
                    <div className="notion-picker__title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.8 }}>
                            <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
                        </svg>
                        Linkear página de Notion
                    </div>
                    <button className="notion-picker__close" onClick={onClose}><X size={14} /></button>
                </div>

                {currentPage && (
                    <div className="notion-picker__current">
                        <span className="notion-picker__current-label">Vinculada actualmente:</span>
                        <div className="notion-picker__current-page">
                            <span>{currentPage.title}</span>
                            <button
                                className="notion-picker__unlink"
                                onClick={() => { onSelect(null); onClose() }}
                            >
                                Desvincular
                            </button>
                        </div>
                    </div>
                )}

                <input
                    className="notion-picker__search"
                    placeholder="Buscar páginas en tu workspace..."
                    value={query}
                    onChange={e => handleSearch(e.target.value)}
                    autoFocus
                />

                <div className="notion-picker__results">
                    {searching && (
                        <div className="notion-picker__loading">
                            <Loader size={14} className='spin' color='currentColor' />
                            Buscando...
                        </div>
                    )}
                    {!searching && error && (
                        <div className="notion-picker__error">{error}</div>
                    )}
                    {!searching && !error && pages.length === 0 && (
                        <div className="notion-picker__empty">
                            {query ? 'Sin resultados' : 'No hay páginas recientes'}
                        </div>
                    )}
                    {!searching && pages.map(page => (
                        <button
                            key={page.id}
                            className={`notion-picker__item${currentPage?.id === page.id ? ' notion-picker__item--active' : ''}`}
                            onClick={() => { onSelect(page); onClose() }}
                        >
                            <span className="notion-picker__item-icon">
                                {page.icon ?? ''}
                            </span>
                            <div className="notion-picker__item-info">
                                <span className="notion-picker__item-title">{page.title}</span>
                                <span className="notion-picker__item-date">
                                    Editada {new Date(page.lastEdited).toLocaleDateString('es-AR', {
                                        day: '2-digit', month: 'short'
                                    })}
                                </span>
                            </div>
                            {currentPage?.id === page.id && (
                                <span className="notion-picker__item-check"><CheckCircle size={12} color='currentColor' /></span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}