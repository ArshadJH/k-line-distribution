import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import Graph from './Graph'

const Group = () => {
  const [songs, setSongs] = useState({})
  const [loading, setLoading] = useState(true)
  const [isCheckingSequentially, setIsCheckingSequentially] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const pauseRef = useRef(false)
  const cancelRef = useRef(false)

  const { groupName } = useParams()
  const searchParams = new URLSearchParams({ group_name: groupName }).toString()

  /** -------------------- Helpers -------------------- **/

  const mapSongsArrayToState = songsArray =>
    Object.fromEntries(
      songsArray.map(song => [song.song_url, { ...song, checked: true, highlight: false }])
    )

  const updateSongs = updates =>
    setSongs(prev => ({ ...prev, ...updates }))

  const toggleSong = songUrl =>
    updateSongs({ [songUrl]: { ...songs[songUrl], checked: !songs[songUrl].checked } })

  const toggleGroup = (releaseDate, checked, grouped) => {
    const updates = grouped[releaseDate].reduce((acc, song) => {
      acc[song.song_url] = { ...songs[song.song_url], checked }
      return acc
    }, {})
    updateSongs(updates)
  }

  const toggleAll = () => {
    const allChecked = Object.values(songs).every(song => song.checked)
    const updates = Object.fromEntries(
      Object.entries(songs).map(([url, song]) => [url, { ...song, checked: !allChecked }])
    )
    setSongs(updates)
  }

  const computeMostCommonAlbum = songsForDate => {
    const freq = songsForDate.reduce((acc, song) => {
      const album = song.album || 'Unknown Album'
      acc[album] = (acc[album] || 0) + 1
      return acc
    }, {})
    return Object.entries(freq).reduce((a, b) => (b[1] > a[1] ? b : a))[0]
  }

  const computeAggregateData = checkedSongs => {
    if (!checkedSongs.length) return null

    const freqMap = checkedSongs.reduce((acc, song) => {
      const key = JSON.stringify(song.artists)
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    const [topArtistsKey] = Object.entries(freqMap).reduce((a, b) => (a[1] >= b[1] ? a : b))
    const topArtists = JSON.parse(topArtistsKey)

    const colorMap = Object.fromEntries(topArtists.map(({ name, color }) => [color, name]))

    const totalLineDistribution = checkedSongs.reduce((acc, song) => {
      const nameToColor = Object.fromEntries(song.artists.map(({ name, color }) => [name, color]))
      Object.entries(song.line_distribution).forEach(([artistName, value]) => {
        const color = nameToColor[artistName]
        if (color in colorMap) acc[color] = (acc[color] || 0) + Number(value)
      })
      return acc
    }, {})

    return {
      line_distribution: Object.fromEntries(
        Object.entries(totalLineDistribution).map(([color, value]) => [colorMap[color], value])
      ),
      artists: topArtists
    }
  }

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

  /** -------------------- Fetch & Initialize -------------------- **/

  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        const response = await fetch(
          `https://brygk8u8b9.execute-api.us-east-1.amazonaws.com/dev?${searchParams}`
        )
        const data = await response.json()
        setSongs(mapSongsArrayToState(data.body))
      } catch (err) {
        console.error('Error fetching group data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchGroupData()
  }, [searchParams])

  /** -------------------- Sequential Check Logic -------------------- **/

  const checkAllSequentially = useCallback(async () => {
    if (isCheckingSequentially) return

    setIsCheckingSequentially(true)
    pauseRef.current = false
    cancelRef.current = false
    setIsPaused(false)

    const urls = Object.keys(songs)
    const total = urls.length

    // Uncheck all first
    setSongs(prev =>
      Object.fromEntries(Object.entries(prev).map(([url, song]) => [url, { ...song, checked: false, highlight: false }]))
    )
    setProgress(0)
    await delay(50)

    await urls.reduce(async (prevPromise, url, index) => {
      await prevPromise
      if (cancelRef.current) return

      // Pause loop
      while (pauseRef.current) await delay(100)

      updateSongs({ [url]: { ...songs[url], checked: true, highlight: true } })
      setProgress(Math.round(((index + 1) / total) * 100))
      await delay(250)
      updateSongs({ [url]: { ...songs[url], highlight: false } })
    }, Promise.resolve())

    setIsCheckingSequentially(false)
    pauseRef.current = false
    cancelRef.current = false
    setIsPaused(false)
  }, [songs, isCheckingSequentially])

  const pauseResume = () => {
    if (!isCheckingSequentially) return
    pauseRef.current = !pauseRef.current
    setIsPaused(pauseRef.current)
  }

  const cancel = () => {
    if (!isCheckingSequentially) return
    cancelRef.current = true
    pauseRef.current = false
    setIsPaused(false)
    setIsCheckingSequentially(false)
    setProgress(0)
  }

  /** -------------------- Derived State -------------------- **/

  const groupedSongs = useMemo(() => {
    return Object.values(songs).reduce((acc, song) => {
      const date = song.release_date || 'Unknown Release Date'
      if (!acc[date]) acc[date] = []
      acc[date].push(song)
      return acc
    }, {})
  }, [songs])

  const checkedSongs = useMemo(() => Object.values(songs).filter(song => song.checked), [songs])
  const aggregateData = useMemo(() => computeAggregateData(checkedSongs), [checkedSongs])
  const allChecked = useMemo(() => Object.values(songs).every(song => song.checked), [songs])

  if (loading) return <div className='p-6'>Loading songs...</div>

  /** -------------------- Render -------------------- **/

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <h1>{groupName}</h1>

      {/* Buttons */}
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={toggleAll} disabled={isCheckingSequentially}>
          {allChecked ? 'Uncheck All Songs' : 'Check All Songs'}
        </button>
        <button style={{ marginLeft: '1rem' }} onClick={checkAllSequentially} disabled={isCheckingSequentially}>
          Animate
        </button>
        <button style={{ marginLeft: '1rem' }} onClick={pauseResume} disabled={!isCheckingSequentially}>
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button style={{ marginLeft: '1rem' }} onClick={cancel} disabled={!isCheckingSequentially}>
          Cancel
        </button>
      </div>

      {/* Progress Bar */}
      {isCheckingSequentially && (
        <div
          style={{
            width: '100%',
            height: '20px',
            backgroundColor: '#ddd',
            borderRadius: '10px',
            overflow: 'hidden',
            marginBottom: '1rem'
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#4caf50',
              transition: 'width 0.2s'
            }}
          />
        </div>
      )}

      <div style={{ display: 'flex' }}>
        {/* Song List */}
        <div style={{ flex: 1 }}>
          {Object.entries(groupedSongs).map(([releaseDate, songsForDate]) => {
            const allCheckedGroup = songsForDate.every(song => song.checked)
            const someChecked = songsForDate.some(song => song.checked)
            const albumName = computeMostCommonAlbum(songsForDate)

            return (
              <div key={releaseDate} style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: 'bold' }}>
                  <input
                    type='checkbox'
                    checked={allCheckedGroup}
                    ref={el => {
                      if (el) el.indeterminate = !allCheckedGroup && someChecked
                    }}
                    onChange={e => toggleGroup(releaseDate, e.target.checked, groupedSongs)}
                  />
                  <span style={{ marginLeft: '0.5rem' }}>
                    {albumName} ({releaseDate})
                  </span>
                </div>

                {songsForDate.map(song => (
                  <div
                    key={song.song_url}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginLeft: '1.5rem',
                      cursor: 'pointer',
                      backgroundColor: song.highlight ? 'rgba(255, 255, 0, 0.3)' : 'transparent',
                      transition: 'background-color 0.3s'
                    }}
                    onClick={() => toggleSong(song.song_url)}
                  >
                    <input
                      type='checkbox'
                      checked={song.checked}
                      onChange={() => toggleSong(song.song_url)}
                      onClick={e => e.stopPropagation()}
                    />
                    <span style={{ marginLeft: '0.5rem' }}>{song.song_name}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {/* Aggregate Graph */}
        {aggregateData && (
          <div style={{ flex: 1, textAlign: 'center' }}>
            <Graph data={aggregateData} />
          </div>
        )}
      </div>
    </div>
  )
}

export default Group
