import { useEffect } from 'react'
import Modal from './Modal'

export default function SessionPdfPreview({ pdf, onClose }) {
  useEffect(() => {
    return () => {
      if (pdf?.url) URL.revokeObjectURL(pdf.url)
    }
  }, [pdf?.url])

  function download() {
    const link = document.createElement('a')
    link.href = pdf.url
    link.download = pdf.filename
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  function openFullScreen() {
    window.open(pdf.url, '_blank', 'noopener,noreferrer')
  }

  return <Modal title="ANTEPRIMA PDF SEDUTA" onClose={onClose} wide>
    <div className="pdf-preview">
      <header>
        <div>
          <b>{pdf.filename}</b>
          <span>{pdf.pages} PAGINE · {pdf.exercises} ESERCITAZIONI</span>
        </div>
        <div>
          <button type="button" className="soft" onClick={openFullScreen}>APRI A TUTTO SCHERMO</button>
          <button type="button" onClick={download}>SCARICA PDF</button>
        </div>
      </header>

      <div className="pdf-frame-wrap">
        <iframe
          title="Anteprima PDF seduta"
          src={pdf.url}
          className="pdf-frame"
        />
        <div className="pdf-mobile-fallback">
          <b>ANTEPRIMA PDF PRONTA</b>
          <span>SU IPHONE O IPAD, APRI IL DOCUMENTO A TUTTO SCHERMO PER USARE IL VISUALIZZATORE DI SAFARI.</span>
          <button type="button" onClick={openFullScreen}>APRI PDF</button>
        </div>
      </div>

      <footer>
        <button type="button" className="ghost" onClick={onClose}>CHIUDI</button>
        <button type="button" onClick={download}>SCARICA PDF</button>
      </footer>
    </div>
  </Modal>
}
