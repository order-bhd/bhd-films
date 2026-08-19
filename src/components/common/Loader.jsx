export default function Loader({ label }) {
  return (
    <div className="loader-wrap">
      <div className="spinner" role="status" aria-label={label || 'Loading'} />
    </div>
  )
}
