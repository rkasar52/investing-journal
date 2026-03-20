import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { importCSV } from '../api/client'

export default function ImportCSV() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await importCSV(fd)
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed. Check your CSV format.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <button
          onClick={() => navigate('/positions')}
          className="text-slate-500 hover:text-slate-300 text-sm mb-2 block"
        >
          ← Back to Positions
        </button>
        <h1 className="text-2xl font-bold text-white">Import Positions from CSV</h1>
        <p className="text-slate-400 text-sm mt-1">
          Upload a CSV file to bulk-import positions. Existing tickers will be skipped.
        </p>
      </div>

      {/* Format guide */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
        <h2 className="text-slate-300 font-medium text-sm uppercase tracking-wider">Expected Format</h2>
        <p className="text-slate-400 text-sm">Your CSV should have these column names (exact names or close variations):</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            ['ticker or symbol', 'Required — stock ticker (e.g. AAPL)'],
            ['shares or quantity', 'Number of shares'],
            ['buy_price or price', 'Price paid per share'],
            ['buy_date or date', 'Date purchased (YYYY-MM-DD)'],
            ['thesis', 'Optional investment thesis'],
          ].map(([col, desc]) => (
            <div key={col} className="col-span-2 flex gap-3">
              <code className="text-indigo-400 text-xs bg-slate-900 px-2 py-0.5 rounded whitespace-nowrap">{col}</code>
              <span className="text-slate-500 text-xs">{desc}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 p-3 bg-slate-900 rounded-lg">
          <p className="text-slate-500 text-xs font-mono">ticker,shares,buy_price,buy_date</p>
          <p className="text-slate-500 text-xs font-mono">AAPL,10,150.00,2023-01-15</p>
          <p className="text-slate-500 text-xs font-mono">MSFT,5,280.50,2023-03-20</p>
        </div>
      </div>

      {/* Upload form */}
      <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2">
            Select CSV File
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
          />
          {file && (
            <p className="text-slate-500 text-xs mt-2">Selected: {file.name}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!file || loading}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Importing...' : 'Import'}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold">Import Results</h2>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-900/30 border border-emerald-800 rounded-lg p-3 text-center">
              <p className="text-emerald-400 text-2xl font-bold">{result.imported.length}</p>
              <p className="text-emerald-600 text-xs mt-1">Imported</p>
            </div>
            <div className="bg-amber-900/30 border border-amber-800 rounded-lg p-3 text-center">
              <p className="text-amber-400 text-2xl font-bold">{result.skipped.length}</p>
              <p className="text-amber-600 text-xs mt-1">Skipped (existing)</p>
            </div>
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-center">
              <p className="text-red-400 text-2xl font-bold">{result.errors.length}</p>
              <p className="text-red-600 text-xs mt-1">Errors</p>
            </div>
          </div>

          {result.imported.length > 0 && (
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Imported</p>
              <div className="flex flex-wrap gap-2">
                {result.imported.map((t) => (
                  <span key={t} className="px-2 py-0.5 bg-emerald-900/40 text-emerald-400 text-xs rounded font-mono">{t}</span>
                ))}
              </div>
            </div>
          )}

          {result.skipped.length > 0 && (
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Skipped (already exist)</p>
              <div className="flex flex-wrap gap-2">
                {result.skipped.map((t) => (
                  <span key={t} className="px-2 py-0.5 bg-slate-700 text-slate-500 text-xs rounded font-mono">{t}</span>
                ))}
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Errors</p>
              {result.errors.map((e) => (
                <p key={e.ticker} className="text-red-400 text-xs">{e.ticker}: {e.error}</p>
              ))}
            </div>
          )}

          {result.imported.length > 0 && (
            <button
              onClick={() => navigate('/positions')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg"
            >
              View All Positions →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
