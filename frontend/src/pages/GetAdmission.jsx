import { useNavigate } from 'react-router-dom'
import AdmissionForm from '../components/AdmissionForm.jsx'
import '../App.css'
import './GetAdmission.css'

export default function GetAdmission() {
  const navigate = useNavigate()

  function handleClose() {
    const idx = window.history.state?.idx
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1)
      return
    }
    navigate('/')
  }

  return (
    <div className="popup-overlay join-form-overlay get-admission-page" role="presentation">
      <div
        className="join-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admission-form-title"
      >
        <button
          type="button"
          className="join-form-close"
          aria-label="Close form"
          onClick={handleClose}
        >
          ×
        </button>
        <AdmissionForm variant="page" onClose={handleClose} />
      </div>
    </div>
  )
}
