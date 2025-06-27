import { useParams } from 'react-router-dom';

const Group = () => {
  const { groupName } = useParams();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4"> {groupName} </h1>
    </div>
  );
};

export default Group;