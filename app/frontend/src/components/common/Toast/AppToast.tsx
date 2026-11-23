import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

export function AppToast() {
  return <ToastContainer autoClose={5_000} closeOnClick pauseOnFocusLoss position="top-right" theme="light" />
}
