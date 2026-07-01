'use client'

import { useEffect } from 'react'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import { geocodeAddressBestEffort } from '@/app/lib/geocoding'
import { listingMapCoordsPayload } from '@/app/lib/listingMapCoords'
import { uploadHouseRulesPdf, removeHouseRulesPdfObject } from '@/app/lib/houseRulesPdf'
import { listingDetailsErrMessage as errMessage } from '@/features/listings/lib/listingDetailsUtils'
import { useTermsGate } from '@/features/auth/hooks/useTermsGate'
import type { TranslationKey } from '@/lib/translations'

export type UseListingDetailsOwnerActionsArgs = {
  id: string
  listing: any
  setListing: (l: any) => void
  currentUser: { id: string } | null
  isOwner: boolean
  isNavView: boolean
  hasActiveAgreement: boolean
  showGalleryFormidlet: boolean
  canOwnerEditListingDetail: boolean
  allImages: string[]
  navNotes: any[]
  setNavNotes: (n: any[]) => void
  handoverReports: any[]
  setHandoverReports: (r: any[]) => void
  ownerAgreementTerminated: boolean
  tenantLinkRegenerating: boolean
  setTenantLinkRegenerating: (v: boolean) => void
  setTenantReportToken: (t: string) => void
  reportTimeFilter: 'all' | '7d' | '30d'
  requestChangeReport: any
  setRequestChangeReport: (r: any) => void
  requestChangeComment: string
  setRequestChangeComment: (s: string) => void
  setRequestChangeSending: (v: boolean) => void
  newNote: string
  setNewNote: (s: string) => void
  setIsSaving: (v: string | null) => void
  setUploading: (v: boolean) => void
  setCurrentImageIndex: React.Dispatch<React.SetStateAction<number>>
  setHouseRulesBusy: (v: boolean) => void
  setCopyFeedback: (v: boolean) => void
  loading: boolean
  confirmDialog: (opts: any) => Promise<boolean>
  toast: (msg: string, type?: 'error' | 'success') => void
  t: (key: TranslationKey) => string
}

export function useListingDetailsOwnerActions(args: UseListingDetailsOwnerActionsArgs) {
  const {
    id, listing, setListing, currentUser, isOwner, isNavView, hasActiveAgreement,
    showGalleryFormidlet, canOwnerEditListingDetail, allImages, navNotes, setNavNotes,
    handoverReports, setHandoverReports, ownerAgreementTerminated, tenantLinkRegenerating,
    setTenantLinkRegenerating, setTenantReportToken, reportTimeFilter, requestChangeReport,
    setRequestChangeReport, requestChangeComment, setRequestChangeComment, setRequestChangeSending,
    newNote, setNewNote, setIsSaving, setUploading, setCurrentImageIndex, setHouseRulesBusy,
    setCopyFeedback, loading, confirmDialog, toast, t,
  } = args
  const { requireActiveAgreement } = useTermsGate()
  const returnTo = `/listings/${id}`
  const listingCity = (listing?.city || '').trim()

  const gateEdit = () =>
    requireActiveAgreement(hasActiveAgreement, listingCity, returnTo, { messageKey: 'signAgreementToEdit' })
  const gateUpload = () =>
    requireActiveAgreement(hasActiveAgreement, listingCity, returnTo, { messageKey: 'signAgreementToUpload' })

  const translateType = (type: string) => {
    if (!type) return ''
    const mapping: Record<string, string> = {
      'Short-term': 'Korttid',
      'Long-term': 'Langtid',
      Apartment: 'Leilighet',
      House: 'Enebolig',
      Shared: 'Bofelleskap',
    }
    return mapping[type] || type
  }

  const handleUpdateField = async (field: string, value: unknown) => {
    if (!listing || !currentUser || !isOwner || isNavView) return

    if (showGalleryFormidlet) {
      toast(t('ownerCannotEditListingWhenFormidlet'), 'error')
      return
    }

    if (!gateEdit()) return

    setIsSaving(field)
    try {
      const { error } = await supabase
        .from('listings')
        .update({ [field]: value })
        .eq('id', id)

      if (error) throw error

      const nextListing = { ...listing, [field]: value }
      setListing(nextListing)

      if (['address', 'city', 'postal_code'].includes(field)) {
        const hit = await geocodeAddressBestEffort({
          address: String(nextListing.address || ''),
          postal_code: String(nextListing.postal_code || ''),
          city: String(nextListing.city || ''),
        })
        if (hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lon)) {
          const coords = listingMapCoordsPayload(hit.lat, hit.lon)
          const { error: geoErr } = await supabase
            .from('listings')
            .update(coords)
            .eq('id', id)
          if (!geoErr) {
            setListing({ ...nextListing, ...coords })
          }
        }
      }

      // Log event
      await supabase.from('audit_logs').insert([
        {
          user_id: currentUser.id,
          action_type: 'UPDATE_FIELD',
          listing_id: id,
          listing_address: nextListing.address,
          details: { field, value },
        },
      ])
    } catch (err: unknown) {
      toast(t('errorSaving') + errMessage(err))
    } finally {
      setIsSaving(null)
    }
  }

  /** Én atomisk lagring — to separate handleUpdateField-kall overskrev pet_policy med gammel state fra closure. */
  const handlePetPolicyChange = async (v: string) => {
    if (!listing || !isOwner || isNavView) return
    if (showGalleryFormidlet) {
      toast(t('ownerCannotEditListingWhenFormidlet'), 'error')
      return
    }
    if (!gateEdit()) return
    const nextDetail = v === 'Enkelte dyr er tillatt' ? listing.pet_policy_detail || '' : ''
    const nextListing = { ...listing, pet_policy: v, pet_policy_detail: nextDetail }
    const previous = listing
    setListing(nextListing)
    setIsSaving('pet_policy')
    try {
      const { error } = await supabase
        .from('listings')
        .update({ pet_policy: v, pet_policy_detail: nextDetail })
        .eq('id', id)
      if (error) throw error
      await supabase.from('audit_logs').insert([
        {
          user_id: currentUser?.id,
          action_type: 'UPDATE_FIELD',
          listing_id: id,
          listing_address: nextListing.address,
          details: { field: 'pet_policy', value: v, pet_policy_detail: nextDetail },
        },
      ])
    } catch (err: unknown) {
      toast(t('errorSaving') + errMessage(err))
      setListing(previous)
    } finally {
      setIsSaving(null)
    }
  }


  const handleRegenerateTenantLink = async () => {
    if (!id || tenantLinkRegenerating) return
    if (ownerAgreementTerminated) {
      toast(t('expiredOwnerNoMediationNav'), 'error')
      return
    }
    if (
      !(await confirmDialog({
        title: t('listingNewLink'),
        message: t('generateNewLinkConfirm'),
        variant: 'danger',
      }))
    )
      return
    setTenantLinkRegenerating(true)
    try {
      const newToken = crypto.randomUUID()
      const { error } = await supabase
        .from('listing_tenant_tokens')
        .upsert([{ listing_id: id, token: newToken }], { onConflict: 'listing_id' })
      if (error) throw error
      setTenantReportToken(newToken)
    } catch (err: unknown) {
      toast(t('couldNotGenerateLink') + errMessage(err))
    } finally {
      setTenantLinkRegenerating(false)
    }
  }

  /** App Router / klientnavigasjon scroller ikke alltid til #anker (f.eks. varsel «Åpne fakturagrunnlag»). */
  useEffect(() => {
    if (loading || !listing) return
    const raw = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '').trim() : ''
    if (!raw) return
    let cancelled = false
    let attempts = 0
    const tryScroll = () => {
      if (cancelled) return true
      const el = document.getElementById(raw)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return true
      }
      return false
    }
    if (tryScroll()) return
    const timer = window.setInterval(() => {
      attempts += 1
      if (tryScroll() || attempts > 50) window.clearInterval(timer)
    }, 80)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [loading, listing, id])

  const handleUploadMore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    if (!gateUpload()) return

    if (showGalleryFormidlet) {
      toast(t('ownerCannotEditListingWhenFormidlet'), 'error')
      return
    }

    setUploading(true)
    try {
      const files = Array.from(e.target.files)
      const newUrls = []

      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `listing-images/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('listings')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from('listings').getPublicUrl(filePath)

        newUrls.push(publicUrl)
      }

      const updatedImageUrls = [...allImages, ...newUrls]

      const { error: updateError } = await supabase
        .from('listings')
        .update({
          image_urls: updatedImageUrls,
          image_url: updatedImageUrls[0], // Ensure we have a main thumbnail
        })
        .eq('id', id)

      if (updateError) throw updateError

      setListing({ ...listing, image_urls: updatedImageUrls, image_url: updatedImageUrls[0] })
      setCurrentImageIndex(updatedImageUrls.length - 1)
      toast(t('imagesAdded'), 'success')
    } catch (err: unknown) {
      toast(t('errorUploading') + errMessage(err))
    } finally {
      setUploading(false)
    }
  }

  const handleReorderListingImage = async (fromIndex: number, direction: -1 | 1) => {
    const toIndex = fromIndex + direction
    if (!listing || !isOwner || isNavView || toIndex < 0 || toIndex >= allImages.length) return
    if (showGalleryFormidlet) {
      toast(t('ownerCannotEditListingWhenFormidlet'), 'error')
      return
    }
    if (!gateEdit()) return
    const next = [...allImages]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setIsSaving('image_urls')
    try {
      const { error } = await supabase
        .from('listings')
        .update({
          image_urls: next,
          image_url: next[0] ?? null,
        })
        .eq('id', id)
      if (error) throw error
      setListing({ ...listing, image_urls: next, image_url: next[0] ?? null })
      setCurrentImageIndex((prev) => {
        const cur = allImages[prev]
        const ni = next.indexOf(cur)
        return ni >= 0 ? ni : 0
      })
    } catch (err: unknown) {
      toast(t('errorSaving') + errMessage(err))
    } finally {
      setIsSaving(null)
    }
  }

  const handleHouseRulesFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !listing || !isOwner || isNavView) return
    if (!gateEdit()) return
    if (!canOwnerEditListingDetail) {
      toast(t('ownerCannotEditListingWhenFormidlet'), 'error')
      return
    }
    setHouseRulesBusy(true)
    try {
      const up = await uploadHouseRulesPdf(supabase, String(id), file)
      if ('error' in up) {
        const msg =
          up.error === 'type'
            ? t('houseRulesValidationType')
            : up.error === 'size'
              ? t('houseRulesValidationSize')
              : t('houseRulesUploadError') + (typeof up.error === 'string' ? up.error : '')
        toast(msg, 'error')
        return
      }
      const prevPath = listing.house_rules_pdf_path
      if (prevPath) await removeHouseRulesPdfObject(supabase, String(prevPath))
      const { error } = await supabase
        .from('listings')
        .update({ house_rules_pdf_path: up.path })
        .eq('id', id)
      if (error) throw error
      setListing({ ...listing, house_rules_pdf_path: up.path })
    } catch (err: unknown) {
      toast(t('houseRulesUploadError') + errMessage(err))
    } finally {
      setHouseRulesBusy(false)
    }
  }

  const handleHouseRulesRemove = async () => {
    if (!listing?.house_rules_pdf_path || !canOwnerEditListingDetail) return
    if (!gateEdit()) return
    setHouseRulesBusy(true)
    try {
      await removeHouseRulesPdfObject(supabase, listing.house_rules_pdf_path)
      const { error } = await supabase
        .from('listings')
        .update({ house_rules_pdf_path: null })
        .eq('id', id)
      if (error) throw error
      setListing({ ...listing, house_rules_pdf_path: null })
    } catch (err: unknown) {
      toast(t('errorSaving') + errMessage(err))
    } finally {
      setHouseRulesBusy(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    try {
      const user = await getAuthUserDeduped()
      if (!user) return

      const { data, error } = await supabase
        .from('nav_notes')
        .insert([
          {
            listing_id: id,
            note_text: newNote,
            created_by: user.id,
          },
        ])
        .select()
        .single()

      if (error) throw error

      setNavNotes([data, ...navNotes])
      setNewNote('')
    } catch (err: unknown) {
      toast(t('errorSavingNote') + errMessage(err))
    }
  }

  /** Tidligere brukt av «Del med bruker»-knappen (fjernet). Beholder for kompatibilitet med cache. */
  const handleCopyLink = () => {
    if (typeof window === 'undefined') return
    navigator.clipboard?.writeText(window.location.href)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  const refetchHandoverReports = () => {
    if (!id) return
    supabase
      .from('handover_reports')
      .select('*')
      .eq('listing_id', id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setHandoverReports(data || []))
  }

  const handleApproveReport = async (reportId: string) => {
    try {
      const user = await getAuthUserDeduped()
      if (!user) return
      const { error } = await supabase
        .from('handover_reports')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .eq('id', reportId)
      if (error) throw error
      refetchHandoverReports()
    } catch (err: unknown) {
      toast(t('errApprove') + errMessage(err))
    }
  }

  const handleRequestChangeSubmit = async () => {
    if (!requestChangeReport || !currentUser || !listing?.owner_id) return
    setRequestChangeSending(true)
    try {
      const comment =
        requestChangeComment.trim() || 'Kommunen ber om at du sender inn en ny overtakelsesrapport.'
      const { error: updateErr } = await supabase
        .from('handover_reports')
        .update({
          approval_status: 'rejected',
          request_change_comment: comment,
        })
        .eq('id', requestChangeReport.id)
      if (updateErr) throw updateErr

      const messageContent = `Kommunen ber om endring i overtakelsesrapporten for ${listing.address}. ${comment}\n\nVennligst send inn en ny overtakelsesrapport.`
      await supabase.from('chat_messages').insert({
        sender_id: currentUser.id,
        receiver_id: listing.owner_id,
        content: messageContent,
      })
      await supabase.from('notifications').insert({
        owner_id: listing.owner_id,
        listing_id: listing.id,
        type: 'NEW_MESSAGE',
        title: t('messageFromKommune'),
        message:
          comment.trim().length > 0
            ? `Kommunen: ${comment.trim()}`
            : 'Kommunen har bedt om ny overtakelsesrapport. Se meldinger.',
        status: 'unread',
        related_user_id: currentUser.id,
      })
      refetchHandoverReports()
      setRequestChangeReport(null)
      setRequestChangeComment('')
    } catch (err: unknown) {
      toast(t('errSend') + errMessage(err))
    } finally {
      setRequestChangeSending(false)
    }
  }

  const filteredHandoverReports = (() => {
    if (reportTimeFilter === 'all') return handoverReports
    const now = Date.now()
    const cut =
      reportTimeFilter === '7d' ? now - 7 * 24 * 60 * 60 * 1000 : now - 30 * 24 * 60 * 60 * 1000
    return handoverReports.filter(
      (r) => r.created_at && new Date(r.created_at).getTime() >= cut
    )
  })()



  return {
    translateType,
    handleUpdateField,
    handlePetPolicyChange,
    handleRegenerateTenantLink,
    handleUploadMore,
    handleReorderListingImage,
    handleHouseRulesFileChange,
    handleHouseRulesRemove,
    handleAddNote,
    handleCopyLink,
    refetchHandoverReports,
    handleApproveReport,
    handleRequestChangeSubmit,
    filteredHandoverReports,
  }
}
