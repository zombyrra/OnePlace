import {
  useCallback,
  useEffect,
  useRef,
  type ClipboardEvent,
  type Dispatch,
  type DragEvent,
  type MutableRefObject,
  type PointerEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type SetStateAction,
} from 'react'
import {
  createId,
  escapeAttribute,
  escapeHtml,
  formatElapsedTime,
  isSafeDownloadDataUrl,
  sanitizePastedHtml,
} from '../../app/appModel'
import type { AppAsset, AudioInputDevice, InkStroke, Page, PageUpdate } from '../../app/appModel'

type UseMediaAndDrawingArgs = {
  activeTab: string
  appState: {
    meta: {
      assets: Record<string, AppAsset>
    }
  }
  attachmentInputRef: RefObject<HTMLInputElement | null>
  audioDevices: AudioInputDevice[]
  audioRecordingSeconds: number
  audioTimerRef: MutableRefObject<number | null>
  drawColor: string
  editorRef: RefObject<HTMLDivElement | null>
  imageInputRef: RefObject<HTMLInputElement | null>
  inkDrawingRef: MutableRefObject<InkStroke | null>
  insertHtmlAtSelection: (html: string) => void
  insertTextAsHtml: (value: string) => void
  insertTranscriptIntoPage: (transcript: string) => void
  isAudioPaneOpen: boolean
  isCurrentSectionLocked: boolean
  isDictating: boolean
  isRecordingAudio: boolean
  isTranscribing: boolean
  keepCaretInView: (behavior?: ScrollBehavior) => void
  mediaRecorderRef: MutableRefObject<MediaRecorder | null>
  mediaStreamRef: MutableRefObject<MediaStream | null>
  page: Page | undefined
  printoutInputRef: RefObject<HTMLInputElement | null>
  readFileAsDataUrl: (file: File) => Promise<string>
  selectedAudioDeviceId: string
  setAudioDevices: (value: AudioInputDevice[]) => void
  setAudioRecordingSeconds: Dispatch<SetStateAction<number>>
  setIsAudioPaneOpen: (value: boolean) => void
  setIsAudioPaused: (value: boolean) => void
  setIsDictating: (value: boolean) => void
  setIsRecordingAudio: (value: boolean) => void
  setIsTranscribing: (value: boolean) => void
  setSaveLabel: (value: string) => void
  setSelectedAudioDeviceId: (value: string) => void
  speechRecognitionRef: MutableRefObject<BrowserSpeechRecognition | null>
  speechTranscriptRef: MutableRefObject<string>
  recordingChunksRef: MutableRefObject<Blob[]>
  dictationRecognitionRef: MutableRefObject<BrowserSpeechRecognition | null>
  syncEditorContent: () => void
  updatePage: (updates: PageUpdate) => void
  addAssetsToState: (assets: AppAsset[]) => void
}

const getSpeechRecognitionApi = () => window.SpeechRecognition ?? window.webkitSpeechRecognition

const getInkPointFromEvent = (event: PointerEvent<SVGSVGElement>) => {
  const svg = event.currentTarget
  const screenPoint = new DOMPoint(event.clientX, event.clientY)
  const screenMatrix = svg.getScreenCTM()

  if (!screenMatrix) {
    const rect = svg.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const svgPoint = screenPoint.matrixTransform(screenMatrix.inverse())

  return {
    x: svgPoint.x,
    y: svgPoint.y,
  }
}

const getInkPointsFromMoveEvent = (event: PointerEvent<SVGSVGElement>) => {
  const nativeEvent = event.nativeEvent
  const coalescedEvents = typeof nativeEvent.getCoalescedEvents === 'function' ? nativeEvent.getCoalescedEvents() : []
  const sourceEvents = coalescedEvents.length > 0 ? coalescedEvents : [event]

  return sourceEvents.map((sourceEvent: { clientX: number; clientY: number }) => {
    const syntheticEvent = {
      clientX: sourceEvent.clientX,
      clientY: sourceEvent.clientY,
      currentTarget: event.currentTarget,
    } as PointerEvent<SVGSVGElement>

    return getInkPointFromEvent(syntheticEvent)
  })
}

export const useMediaAndDrawing = ({
  activeTab,
  appState,
  attachmentInputRef,
  audioDevices,
  audioRecordingSeconds,
  audioTimerRef,
  drawColor,
  editorRef,
  imageInputRef,
  inkDrawingRef,
  insertHtmlAtSelection,
  insertTextAsHtml,
  insertTranscriptIntoPage,
  isAudioPaneOpen,
  isCurrentSectionLocked,
  isDictating,
  isRecordingAudio,
  isTranscribing,
  keepCaretInView,
  mediaRecorderRef,
  mediaStreamRef,
  page,
  printoutInputRef,
  readFileAsDataUrl,
  selectedAudioDeviceId,
  setAudioDevices,
  setAudioRecordingSeconds,
  setIsAudioPaneOpen,
  setIsAudioPaused,
  setIsDictating,
  setIsRecordingAudio,
  setIsTranscribing,
  setSaveLabel,
  setSelectedAudioDeviceId,
  speechRecognitionRef,
  speechTranscriptRef,
  recordingChunksRef,
  dictationRecognitionRef,
  syncEditorContent,
  updatePage,
  addAssetsToState,
}: UseMediaAndDrawingArgs) => {
  const liveInkPolylineRef = useRef<SVGPolylineElement | null>(null)
  const draggedImageRef = useRef<HTMLElement | null>(null)
  const handleWindowPointerMoveRef = useRef<(event: globalThis.PointerEvent) => void>(() => {})
  const handleWindowPointerUpRef = useRef<(event: globalThis.PointerEvent) => void>(() => {})
  const draggedImagePointerRef = useRef<{
    element: HTMLElement
    pointerId: number
    startX: number
    startY: number
    latestX: number
    latestY: number
    isDragging: boolean
  } | null>(null)

  const getDropRangeFromPoint = (clientX: number, clientY: number) => {
    if (document.caretRangeFromPoint) {
      return document.caretRangeFromPoint(clientX, clientY)
    }

    if (document.caretPositionFromPoint) {
      const position = document.caretPositionFromPoint(clientX, clientY)
      if (!position) return null
      const range = document.createRange()
      range.setStart(position.offsetNode, position.offset)
      range.collapse(true)
      return range
    }

    return null
  }

  const cleanupDraggedImageStyles = useCallback((element: HTMLElement | null) => {
    if (!element) return
    element.classList.remove('dragging')
    element.style.removeProperty('transform')
  }, [])

  const moveDraggedImageToPoint = useCallback(
    (element: HTMLElement, clientX: number, clientY: number) => {
      const editor = editorRef.current
      if (!editor) return false

      element.style.pointerEvents = 'none'
      const dropTarget = document.elementFromPoint(clientX, clientY) as HTMLElement | null
      element.style.removeProperty('pointer-events')

      const targetBlock = dropTarget?.closest<HTMLElement>(
        '.embedded-image, p, h1, h2, h3, ul, ol, table, blockquote, pre, figure, section, .attachment-card, .printout-card',
      )

      if (targetBlock && editor.contains(targetBlock) && targetBlock !== element && !element.contains(targetBlock)) {
        const targetRect = targetBlock.getBoundingClientRect()
        const insertBefore = clientY < targetRect.top + targetRect.height / 2
        targetBlock.parentElement?.insertBefore(element, insertBefore ? targetBlock : targetBlock.nextSibling)
        syncEditorContent()
        return true
      }

      const dropRange = getDropRangeFromPoint(clientX, clientY)
      if (dropRange && editor.contains(dropRange.startContainer) && !element.contains(dropRange.startContainer)) {
        const anchorElement =
          dropRange.startContainer instanceof HTMLElement
            ? dropRange.startContainer
            : dropRange.startContainer.parentElement
        const anchorBlock = anchorElement?.closest<HTMLElement>(
          'p, h1, h2, h3, ul, ol, table, blockquote, pre, figure, section, .attachment-card, .printout-card',
        )

        if (anchorBlock && editor.contains(anchorBlock) && anchorBlock !== element) {
          const anchorRect = anchorBlock.getBoundingClientRect()
          const insertBefore = clientY < anchorRect.top + anchorRect.height / 2
          anchorBlock.parentElement?.insertBefore(element, insertBefore ? anchorBlock : anchorBlock.nextSibling)
          syncEditorContent()
          return true
        }
      }

      if (editor.lastElementChild !== element) {
        editor.appendChild(element)
        syncEditorContent()
        return true
      }

      return false
    },
    [editorRef, syncEditorContent],
  )

  const stopPointerImageDrag = useCallback(
    (pointerId?: number, clientX?: number, clientY?: number) => {
      const currentDrag = draggedImagePointerRef.current
      if (!currentDrag) return
      if (pointerId !== undefined && currentDrag.pointerId !== pointerId) return

      window.removeEventListener('pointermove', handleWindowPointerMoveRef.current)
      window.removeEventListener('pointerup', handleWindowPointerUpRef.current)
      window.removeEventListener('pointercancel', handleWindowPointerUpRef.current)

      const { element, isDragging } = currentDrag
      cleanupDraggedImageStyles(element)

      if (isDragging && clientX !== undefined && clientY !== undefined) {
        moveDraggedImageToPoint(element, clientX, clientY)
        window.setTimeout(() => {
          keepCaretInView('smooth')
        }, 0)
      }

      draggedImagePointerRef.current = null
    },
    [cleanupDraggedImageStyles, keepCaretInView, moveDraggedImageToPoint],
  )

  const handleWindowPointerMove = useCallback((event: globalThis.PointerEvent) => {
    const currentDrag = draggedImagePointerRef.current
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return

    const deltaX = event.clientX - currentDrag.startX
    const deltaY = event.clientY - currentDrag.startY
    if (!currentDrag.isDragging && Math.abs(deltaX) + Math.abs(deltaY) < 6) return

    currentDrag.isDragging = true
    currentDrag.latestX = event.clientX
    currentDrag.latestY = event.clientY
    currentDrag.element.classList.add('dragging')
    currentDrag.element.style.transform = `translate(${deltaX}px, ${deltaY}px)`
  }, [])

  const handleWindowPointerUp = useCallback(
    (event: globalThis.PointerEvent) => {
      stopPointerImageDrag(event.pointerId, event.clientX, event.clientY)
    },
    [stopPointerImageDrag],
  )

  useEffect(() => {
    handleWindowPointerMoveRef.current = handleWindowPointerMove
    handleWindowPointerUpRef.current = handleWindowPointerUp
  }, [handleWindowPointerMove, handleWindowPointerUp])

  const clearAudioRecordingTimer = useCallback(() => {
    if (audioTimerRef.current) {
      window.clearInterval(audioTimerRef.current)
      audioTimerRef.current = null
    }
  }, [audioTimerRef])

  useEffect(
    () => () => {
      clearAudioRecordingTimer()
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
      liveInkPolylineRef.current?.remove()
      liveInkPolylineRef.current = null
      window.removeEventListener('pointermove', handleWindowPointerMoveRef.current)
      window.removeEventListener('pointerup', handleWindowPointerUpRef.current)
      window.removeEventListener('pointercancel', handleWindowPointerUpRef.current)
      cleanupDraggedImageStyles(draggedImagePointerRef.current?.element ?? null)
      draggedImagePointerRef.current = null
    },
    [cleanupDraggedImageStyles, clearAudioRecordingTimer, mediaStreamRef],
  )

  const loadAudioDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    const devices = await navigator.mediaDevices.enumerateDevices()
    const inputs = devices
      .filter((device) => device.kind === 'audioinput')
      .map((device, index) => ({
        deviceId: device.deviceId || `audio-${index}`,
        label: device.label || `Microphone ${index + 1}`,
      }))

    setAudioDevices(inputs)
    if (inputs.length > 0 && !inputs.some((device) => device.deviceId === selectedAudioDeviceId)) {
      setSelectedAudioDeviceId(inputs[0].deviceId)
    }
  }, [selectedAudioDeviceId, setAudioDevices, setSelectedAudioDeviceId])

  useEffect(() => {
    if (!isAudioPaneOpen) return
    void loadAudioDevices()
  }, [isAudioPaneOpen, loadAudioDevices])

  const stopDictation = useCallback(() => {
    dictationRecognitionRef.current?.stop()
  }, [dictationRecognitionRef])

  const stopSpeechTranscription = useCallback(() => {
    speechRecognitionRef.current?.stop()
  }, [speechRecognitionRef])

  const startDictation = () => {
    if (isDictating) {
      stopDictation()
      return
    }

    const SpeechRecognitionApi = getSpeechRecognitionApi()
    if (!SpeechRecognitionApi) {
      setSaveLabel('Dictation is not available here')
      return
    }

    if (isTranscribing) {
      stopSpeechTranscription()
    }

    try {
      const recognition = new SpeechRecognitionApi()
      dictationRecognitionRef.current = recognition
      recognition.continuous = true
      recognition.interimResults = false
      recognition.lang = 'en-US'
      recognition.onresult = (event) => {
        const dictatedText = Array.from(
          { length: event.results.length - event.resultIndex },
          (_, index) => event.results[event.resultIndex + index],
        )
          .filter((result) => result.isFinal)
          .map((result) => result[0]?.transcript ?? '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()

        if (!dictatedText) return
        insertTextAsHtml(`${dictatedText} `)
        setSaveLabel(`Dictated: ${dictatedText.slice(0, 48)}${dictatedText.length > 48 ? '...' : ''}`)
      }
      recognition.onerror = (event) => {
        dictationRecognitionRef.current = null
        setIsDictating(false)
        setSaveLabel(event.error === 'not-allowed' ? 'Microphone permission denied' : 'Dictation stopped')
      }
      recognition.onend = () => {
        dictationRecognitionRef.current = null
        setIsDictating(false)
        setSaveLabel('Dictation stopped')
      }
      recognition.start()
      setIsDictating(true)
      setSaveLabel('Listening for dictation...')
    } catch {
      dictationRecognitionRef.current = null
      setIsDictating(false)
      setSaveLabel('Dictation is not available here')
    }
  }

  const insertAudioNote = async (blob: Blob, durationSeconds: number, deviceLabel: string) => {
    const assetId = createId()
    const extension = blob.type.split('/')[1] || 'webm'
    const file = new File([blob], `audio-note-${new Date().toISOString().slice(0, 10)}.${extension}`, {
      type: blob.type || 'audio/webm',
    })
    const dataUrl = await readFileAsDataUrl(file)
    addAssetsToState([
      {
        createdAt: new Date().toISOString(),
        dataUrl,
        id: assetId,
        kind: 'audio',
        mimeType: file.type || 'audio/webm',
        name: file.name,
        sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      },
    ])
    insertHtmlAtSelection(`
      <figure class="audio-note" contenteditable="false">
        <audio controls data-asset-id="${assetId}" src="${dataUrl}"></audio>
        <div class="audio-note-meta">${escapeHtml(formatElapsedTime(durationSeconds))} · ${escapeHtml(deviceLabel)}</div>
        <figcaption>${escapeHtml(file.name)}</figcaption>
      </figure>
    `)
  }

  const openAudioPane = () => {
    void loadAudioDevices()
    setIsAudioPaneOpen(true)
  }

  const startAudioRecording = async () => {
    if (isRecordingAudio) return
    if (!navigator.mediaDevices?.getUserMedia) {
      setSaveLabel('Audio recording is not available here')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedAudioDeviceId && selectedAudioDeviceId !== 'default' ? { deviceId: { exact: selectedAudioDeviceId } } : true,
      })
      mediaStreamRef.current = stream
      await loadAudioDevices()
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recordingChunksRef.current = []
      setAudioRecordingSeconds(0)
      setIsAudioPaused(false)
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data)
        }
      }
      recorder.onstop = async () => {
        const blob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        clearAudioRecordingTimer()
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = null
        mediaRecorderRef.current = null
        recordingChunksRef.current = []
        setIsRecordingAudio(false)
        setIsAudioPaused(false)
        if (blob.size > 0) {
          const deviceLabel =
            audioDevices.find((device) => device.deviceId === selectedAudioDeviceId)?.label ?? 'Microphone'
          await insertAudioNote(blob, audioRecordingSeconds, deviceLabel)
        }
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      audioTimerRef.current = window.setInterval(() => {
        setAudioRecordingSeconds((current) => current + 1)
      }, 1000)
      setIsRecordingAudio(true)
      setIsAudioPaneOpen(true)
      setSaveLabel('Recording audio...')
    } catch {
      setSaveLabel('Microphone permission denied')
    }
  }

  const toggleAudioPause = () => {
    const recorder = mediaRecorderRef.current
    if (!recorder) return
    if (recorder.state === 'recording') {
      recorder.pause()
      clearAudioRecordingTimer()
      setIsAudioPaused(true)
      setSaveLabel('Audio recording paused')
      return
    }

    if (recorder.state === 'paused') {
      recorder.resume()
      audioTimerRef.current = window.setInterval(() => {
        setAudioRecordingSeconds((current) => current + 1)
      }, 1000)
      setIsAudioPaused(false)
      setSaveLabel('Recording audio...')
    }
  }

  const stopAudioRecording = () => {
    clearAudioRecordingTimer()
    mediaRecorderRef.current?.stop()
  }

  const startSpeechTranscription = () => {
    if (isTranscribing) {
      stopSpeechTranscription()
      return
    }

    const SpeechRecognitionApi = getSpeechRecognitionApi()
    if (!SpeechRecognitionApi) {
      setSaveLabel('Speech transcription is not available here')
      return
    }

    if (isDictating) {
      stopDictation()
    }

    try {
      const recognition = new SpeechRecognitionApi()
      speechRecognitionRef.current = recognition
      speechTranscriptRef.current = ''
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'
      recognition.onresult = (event) => {
        const transcript = Array.from({ length: event.results.length }, (_, index) => event.results[index][0]?.transcript ?? '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
        speechTranscriptRef.current = transcript
        setSaveLabel(
          transcript
            ? `Transcribing: ${transcript.slice(0, 48)}${transcript.length > 48 ? '...' : ''}`
            : 'Listening for speech...',
        )
      }
      recognition.onerror = (event) => {
        speechRecognitionRef.current = null
        setIsTranscribing(false)
        setSaveLabel(event.error === 'not-allowed' ? 'Microphone permission denied' : 'Speech transcription stopped')
      }
      recognition.onend = () => {
        const transcript = speechTranscriptRef.current
        speechRecognitionRef.current = null
        speechTranscriptRef.current = ''
        setIsTranscribing(false)
        if (!transcript) {
          setSaveLabel('No transcript captured')
          return
        }

        insertTranscriptIntoPage(transcript)
        setSaveLabel('Transcript inserted into the page')
      }
      recognition.start()
      setIsTranscribing(true)
      setSaveLabel('Listening for speech...')
    } catch {
      speechRecognitionRef.current = null
      setIsTranscribing(false)
      setSaveLabel('Speech transcription is not available here')
    }
  }

  const beginInkStroke = (event: PointerEvent<SVGSVGElement>) => {
    if (!page || activeTab !== 'Draw' || isCurrentSectionLocked) return
    const point = getInkPointFromEvent(event)
    const stroke: InkStroke = {
      color: drawColor,
      id: createId(),
      points: [point],
      width: drawColor === '#ffe266' ? 14 : 3,
    }
    inkDrawingRef.current = stroke
    liveInkPolylineRef.current?.remove()
    const livePolyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
    livePolyline.setAttribute('fill', 'none')
    livePolyline.setAttribute('points', `${point.x},${point.y}`)
    livePolyline.setAttribute('stroke', stroke.color)
    livePolyline.setAttribute('stroke-linecap', 'round')
    livePolyline.setAttribute('stroke-linejoin', 'round')
    livePolyline.setAttribute('stroke-opacity', stroke.color === '#ffe266' ? '0.5' : '1')
    livePolyline.setAttribute('stroke-width', String(stroke.width))
    event.currentTarget.appendChild(livePolyline)
    liveInkPolylineRef.current = livePolyline
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveInkStroke = (event: PointerEvent<SVGSVGElement>) => {
    if (!page || !inkDrawingRef.current || activeTab !== 'Draw' || isCurrentSectionLocked) return
    const points = getInkPointsFromMoveEvent(event)
    if (points.length === 0) return
    const nextStroke = {
      ...inkDrawingRef.current,
      points: [...inkDrawingRef.current.points, ...points],
    }
    inkDrawingRef.current = nextStroke
    liveInkPolylineRef.current?.setAttribute('points', nextStroke.points.map((point) => `${point.x},${point.y}`).join(' '))
  }

  const endInkStroke = (event: PointerEvent<SVGSVGElement>) => {
    if (!inkDrawingRef.current) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    const completedStroke = inkDrawingRef.current
    liveInkPolylineRef.current?.remove()
    liveInkPolylineRef.current = null
    updatePage((currentPage) => ({ inkStrokes: [...currentPage.inkStrokes, completedStroke] }))
    inkDrawingRef.current = null
  }

  const clearInkStrokes = () => {
    if (!page) return
    liveInkPolylineRef.current?.remove()
    liveInkPolylineRef.current = null
    inkDrawingRef.current = null
    updatePage({ inkStrokes: [] })
  }

  const handleImageSelection = async (files: File[]) => {
    if (files.length === 0) return
    const images = await Promise.all(
      files
        .filter((file) => file.type.startsWith('image/'))
        .map(async (file) => ({
          assetId: createId(),
          dataUrl: await readFileAsDataUrl(file),
          kind: 'image' as const,
          mimeType: file.type,
          name: file.name,
          sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
        })),
    )
    if (images.length === 0) return

    addAssetsToState(
      images.map((image) => ({
        createdAt: new Date().toISOString(),
        dataUrl: image.dataUrl,
        id: image.assetId,
        kind: image.kind,
        mimeType: image.mimeType,
        name: image.name,
        sizeLabel: image.sizeLabel,
      })),
    )

    const html = images
      .map(
        (image) => `
          <figure class="embedded-image" contenteditable="false">
            <img alt="${escapeAttribute(image.name)}" data-asset-id="${image.assetId}" draggable="false" src="${image.dataUrl}" />
            <figcaption>${escapeHtml(image.name)}</figcaption>
          </figure>
        `,
      )
      .join('')
    insertHtmlAtSelection(html)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  const handleAttachmentSelection = async (files: File[]) => {
    if (files.length === 0) return
    const attachments = await Promise.all(
      files.map(async (file) => ({
        assetId: createId(),
        dataUrl: await readFileAsDataUrl(file),
        kind: 'file' as const,
        mimeType: file.type || 'application/octet-stream',
        name: file.name,
        sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      })),
    )

    addAssetsToState(
      attachments.map((file) => ({
        createdAt: new Date().toISOString(),
        dataUrl: file.dataUrl,
        id: file.assetId,
        kind: file.kind,
        mimeType: file.mimeType,
        name: file.name,
        sizeLabel: file.sizeLabel,
      })),
    )

    const html = attachments
      .map(
        (file) => `
          <div class="attachment-card" contenteditable="false" data-asset-id="${file.assetId}" data-download-url="${file.dataUrl}" data-file-name="${escapeAttribute(file.name)}">
            <strong class="attachment-title">${escapeHtml(file.name)}</strong>
            <span class="attachment-meta">${escapeHtml(file.sizeLabel)}</span>
          </div>
        `,
      )
      .join('')
    insertHtmlAtSelection(html)
    if (attachmentInputRef.current) attachmentInputRef.current.value = ''
  }

  const handlePrintoutSelection = async (files: File[]) => {
    if (files.length === 0) return
    const printouts = await Promise.all(
      files
        .filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
        .map(async (file) => ({
          assetId: createId(),
          dataUrl: await readFileAsDataUrl(file),
          kind: 'printout' as const,
          mimeType: file.type || 'application/pdf',
          name: file.name,
          sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
        })),
    )
    if (printouts.length === 0) return

    addAssetsToState(
      printouts.map((file) => ({
        createdAt: new Date().toISOString(),
        dataUrl: file.dataUrl,
        id: file.assetId,
        kind: file.kind,
        mimeType: file.mimeType,
        name: file.name,
        sizeLabel: file.sizeLabel,
      })),
    )

    const html = printouts
      .map(
        (file) => `
          <section class="printout-card" contenteditable="false" data-asset-id="${file.assetId}" data-download-url="${file.dataUrl}" data-file-name="${escapeAttribute(file.name)}">
            <div class="printout-preview-shell">
              <iframe class="printout-preview" data-asset-id="${file.assetId}" src="${file.dataUrl}" title="${escapeAttribute(file.name)}"></iframe>
            </div>
            <div class="printout-caption">${escapeHtml(file.name)} · ${escapeHtml(file.sizeLabel)}</div>
          </section>
        `,
      )
      .join('')
    insertHtmlAtSelection(html)
    if (printoutInputRef.current) printoutInputRef.current.value = ''
  }

  const handleEditorPaste = async (event: ClipboardEvent<HTMLDivElement>) => {
    const clipboard = event.clipboardData
    const pastedFiles = [...clipboard.files]
    if (pastedFiles.length > 0) {
      event.preventDefault()
      const images = pastedFiles.filter((file) => file.type.startsWith('image/'))
      if (images.length > 0) {
        await handleImageSelection(images)
        return
      }
    }

    const html = clipboard.getData('text/html')
    const text = clipboard.getData('text/plain')
    if (!html && !text) return

    event.preventDefault()
    if (html) {
      insertHtmlAtSelection(sanitizePastedHtml(html))
      return
    }

    insertTextAsHtml(text)
    window.setTimeout(() => {
      keepCaretInView()
    }, 0)
  }

  const handleEditorAssetClick = (eventTarget: HTMLElement) => {
    const assetCard = eventTarget.closest<HTMLElement>('.attachment-card, .printout-card')
    if (!assetCard) return false

    const assetId = assetCard.dataset.assetId
    const asset = assetId ? appState.meta.assets[assetId] : undefined
    const downloadUrl = assetCard.dataset.downloadUrl ?? asset?.dataUrl
    const fileName = assetCard.dataset.fileName ?? asset?.name ?? 'attachment'
    if (downloadUrl && isSafeDownloadDataUrl(downloadUrl)) {
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = fileName
      anchor.click()
    }
    return true
  }

  const handleEditorDragStart = (event: DragEvent<HTMLDivElement>) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return

    const imageFigure = target.closest<HTMLElement>('.embedded-image')
    if (!imageFigure || !editorRef.current?.contains(imageFigure)) return

    event.preventDefault()
  }

  const handleEditorDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!draggedImageRef.current) return
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  const handleEditorDrop = (event: DragEvent<HTMLDivElement>) => {
    const draggedImage = draggedImageRef.current
    if (!draggedImage) return

    event.preventDefault()
    const dropRange = getDropRangeFromPoint(event.clientX, event.clientY)
    if (!dropRange) return
    if (draggedImage.contains(dropRange.startContainer)) return

    const editor = editorRef.current
    if (!editor || !editor.contains(dropRange.startContainer)) return

    const insertedNode = draggedImage
    insertedNode.classList.remove('dragging')
    dropRange.deleteContents()
    dropRange.insertNode(insertedNode)

    const trailingBreak = document.createElement('p')
    trailingBreak.innerHTML = '<br />'
    if (!insertedNode.nextSibling) {
      insertedNode.parentNode?.appendChild(trailingBreak)
    }

    syncEditorContent()
    window.setTimeout(() => {
      keepCaretInView('smooth')
    }, 0)
    draggedImageRef.current = null
  }

  const handleEditorDragEnd = () => {
    draggedImageRef.current?.classList.remove('dragging')
    draggedImageRef.current = null
  }

  const handleEditorPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return

    const target = event.target
    if (!(target instanceof HTMLElement)) return

    const imageFigure = target.closest<HTMLElement>('.embedded-image')
    if (!imageFigure || !editorRef.current?.contains(imageFigure)) return

    event.preventDefault()
    draggedImagePointerRef.current = {
      element: imageFigure,
      isDragging: false,
      latestX: event.clientX,
      latestY: event.clientY,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    }

    window.addEventListener('pointermove', handleWindowPointerMoveRef.current)
    window.addEventListener('pointerup', handleWindowPointerUpRef.current)
    window.addEventListener('pointercancel', handleWindowPointerUpRef.current)
  }

  return {
    beginInkStroke,
    clearInkStrokes,
    handleAttachmentSelection,
    handleEditorAssetClick,
    handleEditorDragEnd,
    handleEditorDragOver,
    handleEditorDragStart,
    handleEditorPointerDown,
    handleEditorPaste,
    handleImageSelection,
    handlePrintoutSelection,
    handleEditorDrop,
    loadAudioDevices,
    moveInkStroke,
    openAudioPane,
    startAudioRecording,
    startDictation,
    startSpeechTranscription,
    stopAudioRecording,
    toggleAudioPause,
    endInkStroke,
  }
}
