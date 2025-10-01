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

  // Fetch group data
  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        const response = await fetch(
          `https://brygk8u8b9.execute-api.us-east-1.amazonaws.com/dev?${searchParams}`
        )
        const data = await response.json()
        initializeState(data.body)
      } catch (err) {
        console.error('Error fetching group data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchGroupData()
  }, [searchParams])

  const initializeState = songsArray => {
    const songsMap = Object.fromEntries(
      songsArray.map(song => [song.song_url, { ...song, checked: true, highlight: false }])
    )
    setSongs(songsMap)
  }

  const handleChange = useCallback(songUrl => {
    setSongs(prev => ({
      ...prev,
      [songUrl]: { ...prev[songUrl], checked: !prev[songUrl].checked }
    }))
  }, [])

  const handleGroupChange = useCallback(
    (releaseDate, checked, groupedSongs) => {
      setSongs(prev => {
        const updates = {}
        groupedSongs[releaseDate].forEach(song => {
          updates[song.song_url] = { ...prev[song.song_url], checked }
        })
        return { ...prev, ...updates }
      })
    },
    []
  )

  const handleToggleAll = useCallback(() => {
    setSongs(prev => {
      const allChecked = Object.values(prev).every(song => song.checked)
      return Object.fromEntries(
        Object.entries(prev).map(([url, song]) => [
          url,
          { ...song, checked: !allChecked }
        ])
      )
    })
  }, [])

  // Sequential check with pause/resume and cancel
  const handleCheckAllSequentially = useCallback(async () => {
    if (isCheckingSequentially) return
    setIsCheckingSequentially(true)
    pauseRef.current = false
    cancelRef.current = false
    setIsPaused(false)

    const urls = Object.keys(songs)
    const total = urls.length

    // Uncheck all first
    setSongs(prev =>
      Object.fromEntries(
        Object.entries(prev).map(([url, song]) => [
          url,
          { ...song, checked: false, highlight: false }
        ])
      )
    )
    setProgress(0)
    await new Promise(resolve => setTimeout(resolve, 50)) // allow UI to update

    for (let i = 0; i < total; i++) {
      if (cancelRef.current) break

      // Pause loop using ref
      while (pauseRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100))
        if (cancelRef.current) break
      }

      const url = urls[i]
      setSongs(prev => ({
        ...prev,
        [url]: { ...prev[url], checked: true, highlight: true }
      }))
      setProgress(Math.round(((i + 1) / total) * 100))

      await new Promise(resolve => setTimeout(resolve, 250)) // quarter second delay

      setSongs(prev => ({
        ...prev,
        [url]: { ...prev[url], highlight: false }
      }))
    }

    setIsCheckingSequentially(false)
    pauseRef.current = false
    cancelRef.current = false
    setIsPaused(false)
  }, [songs, isCheckingSequentially])

  const handlePauseResume = () => {
    if (!isCheckingSequentially) return
    pauseRef.current = !pauseRef.current
    setIsPaused(pauseRef.current)
  }

  const handleCancel = () => {
    if (!isCheckingSequentially) return
    cancelRef.current = true
    pauseRef.current = false
    setIsPaused(false)
    setIsCheckingSequentially(false)
    setProgress(0)
  }

  const groupedSongs = useMemo(() => {
    return Object.values(songs).reduce((acc, song) => {
      const date = song.release_date || 'Unknown Release Date'
      if (!acc[date]) acc[date] = []
      acc[date].push(song)
      return acc
    }, {})
  }, [songs])

  const aggregateData = useMemo(() => {
    const checkedSongs = Object.values(songs).filter(song => song.checked)
    if (!checkedSongs.length) return null

    const freqMap = checkedSongs.reduce((acc, song) => {
      const key = JSON.stringify(song.artists)
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    const [topArtistsKey] = Object.entries(freqMap).reduce((a, b) =>
      a[1] >= b[1] ? a : b
    )
    const topArtists = JSON.parse(topArtistsKey)

    const colorMap = Object.fromEntries(
      topArtists.map(({ name, color }) => [color, name])
    )

    const totalLineDistribution = checkedSongs.reduce((acc, song) => {
      const nameToColor = Object.fromEntries(
        song.artists.map(({ name, color }) => [name, color])
      )
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
  }, [songs])

  const getMostCommonAlbum = songsForDate => {
    const freq = songsForDate.reduce((acc, song) => {
      const album = song.album || 'Unknown Album'
      acc[album] = (acc[album] || 0) + 1
      return acc
    }, {})
    return Object.entries(freq).reduce((a, b) => (b[1] > a[1] ? b : a))[0]
  }

  if (loading) return <div className='p-6'>Loading songs...</div>

  const allChecked = Object.values(songs).every(song => song.checked)

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <h1>{groupName}</h1>

      {/* Buttons */}
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={handleToggleAll} disabled={isCheckingSequentially}>
          {allChecked ? 'Uncheck All Songs' : 'Check All Songs'}
        </button>
        <button
          style={{ marginLeft: '1rem' }}
          onClick={handleCheckAllSequentially}
          disabled={isCheckingSequentially}
        >
          Animate
        </button>
        <button
          style={{ marginLeft: '1rem' }}
          onClick={handlePauseResume}
          disabled={!isCheckingSequentially}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button
          style={{ marginLeft: '1rem' }}
          onClick={handleCancel}
          disabled={!isCheckingSequentially}
        >
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
            const albumName = getMostCommonAlbum(songsForDate)

            return (
              <div key={releaseDate} style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: 'bold' }}>
                  <input
                    type='checkbox'
                    checked={allCheckedGroup}
                    ref={el => {
                      if (el) el.indeterminate = !allCheckedGroup && someChecked
                    }}
                    onChange={e =>
                      handleGroupChange(releaseDate, e.target.checked, groupedSongs)
                    }
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
                      backgroundColor: song.highlight
                        ? 'rgba(255, 255, 0, 0.3)'
                        : 'transparent',
                      transition: 'background-color 0.3s'
                    }}
                    onClick={() => handleChange(song.song_url)}
                  >
                    <input
                      type='checkbox'
                      checked={song.checked}
                      onChange={() => handleChange(song.song_url)}
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
