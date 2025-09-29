import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = "https://brygk8u8b9.execute-api.us-east-1.amazonaws.com/dev";

const Home = () => {
  const [groupNames, setGroupNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error(`Error ${response.status}: Failed to fetch groups`);
        }
        const data = await response.json();
        setGroupNames(data.body || []);
      } catch (err) {
        console.error("Error fetching group names:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  const encodeGroupName = (name) => encodeURIComponent(name);

  if (loading) {
    return <div className="p-6">Loading groups...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-6">
      {groupNames.length === 0 ? (
        <p>No groups found.</p>
      ) : (
        <ul className="list-disc pl-6">
          {groupNames.map((groupName) => (
            <li key={groupName}>
              <Link
                to={`/k-line-distribution/${encodeGroupName(groupName)}`}
                className="text-blue-600 hover:underline"
              >
                {groupName}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Home;