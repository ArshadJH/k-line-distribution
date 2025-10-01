import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import Graph from './Graph'

const Group = () => {
  const [songs, setSongs] = useState({})
  const [loading, setLoading] = useState(true)

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

  // Initialize state from API data
  const initializeState = songsArray => {
    const songsMap = Object.fromEntries(
      songsArray.map(song => [song.song_url, { ...song, checked: true }])
    )
    setSongs(songsMap)
  }

  // Toggle individual song
  const handleChange = useCallback(songUrl => {
    setSongs(prev => ({
      ...prev,
      [songUrl]: { ...prev[songUrl], checked: !prev[songUrl].checked }
    }))
  }, [])

  // Toggle all songs in a release date group
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

  // Toggle all songs at once
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

  // Group songs by release_date
  const groupedSongs = useMemo(() => {
    return Object.values(songs).reduce((acc, song) => {
      const date = song.release_date || 'Unknown Release Date'
      if (!acc[date]) acc[date] = []
      acc[date].push(song)
      return acc
    }, {})
  }, [songs])

  // Recompute artists + aggregate data based on checked songs
  const aggregateData = useMemo(() => {
    const checkedSongs = Object.values(songs).filter(song => song.checked)
    if (!checkedSongs.length) return null

    // 🔹 Find the most frequent artist set among checked songs
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
        if (color in colorMap) {
          acc[color] = (acc[color] || 0) + Number(value)
        }
      })

      return acc
    }, {})

    return {
      line_distribution: Object.fromEntries(
        Object.entries(totalLineDistribution).map(([color, value]) => [
          colorMap[color],
          value
        ])
      ),
      artists: topArtists
    }
  }, [songs])

  // Helper: get most common album name in a group
  const getMostCommonAlbum = songsForDate => {
    const freq = songsForDate.reduce((acc, song) => {
      const album = song.album || 'Unknown Album'
      acc[album] = (acc[album] || 0) + 1
      return acc
    }, {})
    return Object.entries(freq).reduce((a, b) => (b[1] > a[1] ? b : a))[0]
  }

  if (loading) {
    return <h2>Loading songs...</h2>
  }

  const allChecked = Object.values(songs).every(song => song.checked)
  const toggleButtonLabel = allChecked ? 'Uncheck All Songs' : 'Check All Songs'

  return (
    <div style={{ display: 'flex' }}>
      {/* Song List */}
      <div style={{ flex: 1 }}>
        <h1>{groupName}</h1>

        {/* Toggle All Button */}
        <div style={{ marginBottom: '1rem' }}>
          <button onClick={handleToggleAll}>{toggleButtonLabel}</button>
        </div>

        {Object.entries(groupedSongs).map(([releaseDate, songsForDate]) => {
          const allCheckedGroup = songsForDate.every(song => song.checked)
          const someChecked = songsForDate.some(song => song.checked)
          const albumName = getMostCommonAlbum(songsForDate)

          return (
            <div key={releaseDate} style={{ marginBottom: '1rem' }}>
              {/* Group checkbox */}
              <div style={{ fontWeight: 'bold' }}>
                <input
                  type='checkbox'
                  checked={allCheckedGroup}
                  ref={el => {
                    if (el) el.indeterminate = !allCheckedGroup && someChecked
                  }}
                  onChange={e =>
                    handleGroupChange(
                      releaseDate,
                      e.target.checked,
                      groupedSongs
                    )
                  }
                />
                <span style={{ marginLeft: '0.5rem' }}>
                  {albumName} ({releaseDate})
                </span>
              </div>

              {/* Individual songs */}
              {songsForDate.map(song => (
                <div
                  key={song.song_url}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginLeft: '1.5rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleChange(song.song_url)} // toggle on container click
                >
                  <input
                    type='checkbox'
                    checked={song.checked}
                    onChange={() => handleChange(song.song_url)}
                    onClick={e => e.stopPropagation()} // prevent double toggle
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
          <h2>Aggregate of Checked Songs</h2>
          <Graph data={aggregateData} />
        </div>
      )}
    </div>
  )
}

export default Group
