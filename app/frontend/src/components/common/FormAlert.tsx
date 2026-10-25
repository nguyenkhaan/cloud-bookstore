export function FormAlert({ message, tone = 'error' }: { message: string; tone?: 'error' | 'success' }) {
    const styles =
        tone === 'error'
            ? 'border-red-300 bg-red-50 text-red-900'
            : 'border-teal-300 bg-teal-50 text-teal-900'
    return (
        <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-md border px-3 py-2.5 text-sm ${styles}`}>
            {message}
        </div>
    )
}