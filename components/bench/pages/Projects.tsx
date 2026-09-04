'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  FolderPlusIcon, 
  CpuIcon, 
  CheckCircle2Icon, 
  Trash2Icon, 
  ArrowRightIcon, 
  CodeIcon, 
  ActivityIcon, 
  SparklesIcon, 
  SearchIcon, 
  LayersIcon, 
  ClockIcon, 
  AlertTriangleIcon, 
  InfoIcon, 
  XIcon, 
  PlusIcon,
  PlayIcon,
  ShieldAlertIcon,
  ZapIcon
} from 'lucide-react'
import { useBench } from '../BenchContext'
import { useAuth } from '@/components/auth/AuthContext'
import { useLanguage } from '../LanguageContext'
import { BOARD_DETAILS, BOARD_FQBNS, type BoardDetails, type Project } from '@/lib/types'

export function Projects() {
  const { projects, activeProject, setActiveProject, createProject, deleteProject, projectsLoading } = useBench()
  const { user, isGuest } = useAuth()
  const { t, lang } = useLanguage()
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isGuestUpgradeModalOpen, setIsGuestUpgradeModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Creation form states
  const [newProjectName, setNewProjectName] = useState('')
  const [newBoardType, setNewBoardType] = useState('Arduino Uno')
  const [newDescription, setNewDescription] = useState('')
  const [newTemplate, setNewTemplate] = useState<'telemetry' | 'blink' | 'blank'>('telemetry')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const boardsList = useMemo(() => Object.values(BOARD_DETAILS), [])

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.board_type.toLowerCase().includes(searchQuery.toLowerCase())
      
      if (selectedCategory === 'all') return matchesSearch
      const boardInfo = BOARD_DETAILS[p.board_type]
      if (!boardInfo) return matchesSearch
      return matchesSearch && boardInfo.category === selectedCategory
    })
  }, [projects, searchQuery, selectedCategory])

  const handleOpenCreateModal = () => {
    if (isGuest) {
      setIsGuestUpgradeModalOpen(true)
      return
    }
    setNewProjectName('')
    setNewBoardType(activeProject?.board_type || 'Arduino Uno')
    setNewDescription('')
    setNewTemplate('telemetry')
    setIsCreateModalOpen(true)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isGuest) {
      setIsGuestUpgradeModalOpen(true)
      return
    }
    if (!newProjectName.trim()) return

    setIsSubmitting(true)
    try {
      const created = await createProject(newProjectName, newBoardType, newDescription, newTemplate)
      setIsCreateModalOpen(false)
      setActiveProject(created)
      router.push('/dashboard')
    } catch (err) {
      console.error('Failed to create project:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelectProject = (proj: Project, directNavigate: string = '/dashboard') => {
    setActiveProject(proj)
    router.push(directNavigate)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (isGuest) {
      setIsGuestUpgradeModalOpen(true)
      return
    }
    if (confirm(t('projects.deleteConfirm'))) {
      setDeletingId(id)
      try {
        await deleteProject(id)
      } finally {
        setDeletingId(null)
      }
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-8">
      
      {/* Top Banner / Guest Notice */}
      {isGuest && (
        <div className="p-4 rounded-xl border bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <ShieldAlertIcon size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                {t('guest.projectsLocked')}
              </span>
              <p className="text-xs text-bench-muted">
                {t('guest.projectsLockedDesc')}
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold transition-all shadow-lg hover:shadow-blue-500/20 shrink-0"
          >
            {t('guest.unlockFullAccess')}
          </Link>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-bench-border pb-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <LayersIcon size={18} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-bench-text">
              {t('projects.title')}
            </h1>
          </div>
          <p className="text-xs text-bench-muted max-w-xl">
            {t('projects.subtitle')}
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-mono font-bold transition-all shadow-lg cursor-pointer self-start md:self-auto ${
            isGuest 
              ? 'bg-bench-surface hover:bg-bench-subtle text-amber-400 border border-amber-500/40' 
              : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/25 hover:scale-[1.02]'
          }`}
        >
          {isGuest ? <ShieldAlertIcon size={16} className="text-amber-400" /> : <FolderPlusIcon size={16} />}
          {t('projects.newProject')}
          {isGuest && <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono">Locked</span>}
        </button>
      </div>

      {/* Active Project Highlight Card */}
      {activeProject && (
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/30 via-bench-surface to-bench-surface p-6 shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t('projects.activeBadge')}
                </span>
                <span className="text-[11px] font-mono text-bench-muted">
                  {t('projects.updated')}: {new Date(activeProject.updated_at).toLocaleDateString()}
                </span>
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-bench-text flex items-center gap-2">
                  {activeProject.name}
                </h2>
                <p className="text-xs text-bench-muted mt-1 max-w-2xl">
                  {activeProject.description || 'Target microcontroller test bench workspace configured and ready.'}
                </p>
              </div>

              {/* Hardware Specs Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-bench-bg border border-bench-border text-xs font-mono text-blue-400 font-semibold">
                  <CpuIcon size={13} />
                  {activeProject.board_type}
                </div>
                {BOARD_DETAILS[activeProject.board_type] && (
                  <>
                    <span className="px-2 py-0.5 rounded bg-bench-bg border border-bench-border text-[10px] font-mono text-bench-muted">
                      MCU: {BOARD_DETAILS[activeProject.board_type].mcu}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-bench-bg border border-bench-border text-[10px] font-mono text-bench-muted">
                      Clock: {BOARD_DETAILS[activeProject.board_type].clock}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-bench-bg border border-bench-border text-[10px] font-mono text-bench-muted">
                      Digital I/O: {BOARD_DETAILS[activeProject.board_type].digitalPins}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap md:flex-col gap-2.5 shrink-0">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold transition-all shadow-md hover:scale-[1.02] cursor-pointer"
              >
                <ActivityIcon size={14} />
                Launch Dashboard
                <ArrowRightIcon size={12} />
              </button>
              <button
                onClick={() => router.push('/programmation')}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-bench-surface hover:bg-bench-subtle border border-bench-border text-bench-text text-xs font-mono font-semibold transition-all cursor-pointer"
              >
                <CodeIcon size={14} className="text-emerald-400" />
                Code & Firmware
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects List Section */}
      <div className="flex flex-col gap-5">
        
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <SearchIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bench-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search projects by name, MCU..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-bench-surface border border-bench-border text-xs text-bench-text placeholder-bench-muted/60 focus:outline-none focus:border-blue-500 transition-all font-sans"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All MCUs' },
              { id: 'avr', label: 'AVR / Uno / Mega' },
              { id: 'esp32', label: 'ESP32' },
              { id: 'samd', label: 'ARM / SAMD' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 font-bold'
                    : 'bg-bench-surface text-bench-muted hover:text-bench-text border border-bench-border'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="border border-dashed border-bench-border rounded-2xl p-12 text-center flex flex-col items-center gap-4 bg-bench-surface/30">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <FolderPlusIcon size={24} />
            </div>
            <div className="flex flex-col gap-1 max-w-md">
              <h3 className="text-base font-bold text-bench-text">{t('projects.noProjects')}</h3>
              <p className="text-xs text-bench-muted">
                {t('projects.noProjectsDesc')}
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-mono font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md cursor-pointer"
            >
              <PlusIcon size={14} />
              {t('projects.createProject')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map(proj => {
              const isActive = activeProject?.id === proj.id
              const boardInfo = BOARD_DETAILS[proj.board_type] || BOARD_DETAILS['Arduino Uno']

              return (
                <div
                  key={proj.id}
                  onClick={() => handleSelectProject(proj)}
                  className={`group rounded-xl border p-5 flex flex-col justify-between gap-4 transition-all duration-200 cursor-pointer relative ${
                    isActive
                      ? 'bg-bench-surface border-blue-500/60 shadow-lg shadow-blue-500/5 ring-1 ring-blue-500/30'
                      : 'bg-bench-surface hover:bg-bench-surface/90 border-bench-border hover:border-blue-500/40 hover:scale-[1.01]'
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    
                    {/* Card Top: Board category badge & Active tag */}
                    <div className="flex items-center justify-between">
                      <div
                        className="px-2.5 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1.5"
                        style={{
                          backgroundColor: `${boardInfo.badgeColor}18`,
                          color: boardInfo.badgeColor,
                          border: `1px solid ${boardInfo.badgeColor}33`,
                        }}
                      >
                        <CpuIcon size={12} />
                        {proj.board_type}
                      </div>

                      {isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2Icon size={10} />
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-bench-muted">
                          {new Date(proj.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-base font-bold text-bench-text group-hover:text-blue-400 transition-colors">
                        {proj.name}
                      </h3>
                      <p className="text-xs text-bench-muted mt-1 line-clamp-2 leading-relaxed">
                        {proj.description || boardInfo.description}
                      </p>
                    </div>

                    {/* Microcontroller Specs Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-bench-border/50 text-[10px] font-mono text-bench-muted">
                      <div className="flex items-center gap-1">
                        <span className="text-bench-muted/60">MCU:</span>
                        <span className="text-bench-text font-semibold">{boardInfo.mcu}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-bench-muted/60">Clock:</span>
                        <span className="text-bench-text font-semibold">{boardInfo.clock}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-bench-muted/60">Digital:</span>
                        <span className="text-bench-text font-semibold">{boardInfo.digitalPins} pins</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-bench-muted/60">Analog:</span>
                        <span className="text-bench-text font-semibold">{boardInfo.analogPins} pins</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-bench-border/50">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectProject(proj, '/dashboard')
                      }}
                      className="flex items-center gap-1.5 text-xs font-mono font-bold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {t('projects.openProject')}
                      <ArrowRightIcon size={12} className="group-hover:translate-x-1 transition-transform" />
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectProject(proj, '/programmation')
                        }}
                        title="Open Code Editor"
                        className="p-1.5 rounded hover:bg-bench-subtle text-bench-muted hover:text-emerald-400 transition-colors"
                      >
                        <CodeIcon size={14} />
                      </button>

                      {projects.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(proj.id, e)}
                          title="Delete Project"
                          className="p-1.5 rounded hover:bg-red-500/10 text-bench-muted hover:text-red-400 transition-colors"
                        >
                          <Trash2Icon size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-bench-surface border border-bench-border rounded-2xl max-w-2xl w-full p-6 md:p-8 flex flex-col gap-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-bench-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <FolderPlusIcon size={18} />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-lg font-bold text-bench-text">
                    {t('projects.createModalTitle')}
                  </h2>
                  <p className="text-xs text-bench-muted">
                    {t('projects.createModalDesc')}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-bench-muted hover:text-bench-text hover:bg-bench-subtle transition-colors"
              >
                <XIcon size={18} />
              </button>
            </div>

            {/* Creation Form */}
            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-5">
              
              {/* Project Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-semibold text-bench-text uppercase tracking-wider">
                  {t('projects.nameLabel')} <span className="text-blue-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder={t('projects.namePlaceholder')}
                  className="w-full px-4 py-2.5 rounded-lg bg-bench-input-bg border border-bench-border text-sm text-bench-text placeholder-bench-muted/60 focus:outline-none focus:border-blue-500 transition-all font-sans"
                />
              </div>

              {/* Target Microcontroller Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono font-semibold text-bench-text uppercase tracking-wider">
                  {t('projects.boardLabel')} <span className="text-blue-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                  {boardsList.map(board => {
                    const isSelected = newBoardType === board.name
                    return (
                      <div
                        key={board.id}
                        onClick={() => setNewBoardType(board.name)}
                        className={`p-3.5 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-600/15 border-blue-500 ring-1 ring-blue-500/50 shadow-md'
                            : 'bg-bench-bg hover:bg-bench-subtle/50 border-bench-border'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-bench-text flex items-center gap-1.5">
                            <CpuIcon size={14} style={{ color: board.badgeColor }} />
                            {board.name}
                          </span>
                          <span
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold"
                            style={{ backgroundColor: `${board.badgeColor}20`, color: board.badgeColor }}
                          >
                            {board.voltage}
                          </span>
                        </div>
                        <p className="text-[11px] text-bench-muted line-clamp-2 leading-tight">
                          {board.description}
                        </p>
                        <div className="flex items-center gap-2 text-[9px] font-mono text-bench-muted/80 pt-1 border-t border-bench-border/40">
                          <span>{board.mcu}</span>
                          <span>•</span>
                          <span>{board.clock}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Initial Sketch Template */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono font-semibold text-bench-text uppercase tracking-wider">
                  {t('projects.templateLabel')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'telemetry', label: t('projects.templateTelemetry'), icon: ActivityIcon, badge: 'Recommended' },
                    { id: 'blink', label: t('projects.templateBlink'), icon: ZapIcon, badge: 'Diagnostic' },
                    { id: 'blank', label: t('projects.templateBlank'), icon: CodeIcon, badge: 'Empty' }
                  ].map(tmpl => (
                    <div
                      key={tmpl.id}
                      onClick={() => setNewTemplate(tmpl.id as any)}
                      className={`p-3 rounded-lg border flex flex-col gap-1.5 cursor-pointer transition-all ${
                        newTemplate === tmpl.id
                          ? 'bg-blue-600/15 border-blue-500 text-blue-400 font-semibold'
                          : 'bg-bench-bg hover:bg-bench-subtle/50 border-bench-border text-bench-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <tmpl.icon size={14} className={newTemplate === tmpl.id ? 'text-blue-400' : 'text-bench-muted'} />
                        <span className="text-[9px] font-mono px-1 rounded bg-bench-surface border border-bench-border text-bench-muted">
                          {tmpl.badge}
                        </span>
                      </div>
                      <span className="text-[11px] leading-tight text-bench-text">{tmpl.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Project Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-semibold text-bench-text uppercase tracking-wider">
                  {t('projects.descLabel')}
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder={t('projects.descPlaceholder')}
                  className="w-full px-4 py-2 rounded-lg bg-bench-input-bg border border-bench-border text-xs text-bench-text placeholder-bench-muted/60 focus:outline-none focus:border-blue-500 transition-all font-sans resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-bench-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg text-xs font-mono text-bench-muted hover:text-bench-text transition-colors"
                >
                  {t('action.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newProjectName.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-mono font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Creating...</span>
                  ) : (
                    <>
                      <PlayIcon size={13} />
                      {t('projects.launchBtn')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guest Upgrade / Locked Modal */}
      {isGuestUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-bench-surface border border-bench-border rounded-2xl max-w-md w-full p-6 md:p-8 flex flex-col gap-6 shadow-2xl relative">
            <button
              onClick={() => setIsGuestUpgradeModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-bench-muted hover:text-bench-text hover:bg-bench-subtle transition-colors"
            >
              <XIcon size={18} />
            </button>

            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <ShieldAlertIcon size={28} />
              </div>
              <h3 className="text-lg font-bold text-bench-text">
                {t('guest.projectsLocked')}
              </h3>
              <p className="text-xs text-bench-muted leading-relaxed">
                {t('guest.projectsLockedDesc')}
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <Link
                href="/login"
                className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-500/25"
              >
                <span>{t('guest.unlockFullAccess')}</span>
                <ArrowRightIcon size={14} />
              </Link>
              <button
                type="button"
                onClick={() => setIsGuestUpgradeModalOpen(false)}
                className="w-full py-2.5 rounded-lg text-xs font-mono text-bench-muted hover:text-bench-text transition-colors"
              >
                Continue Exploring Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
