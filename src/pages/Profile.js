import { useParams } from "react-router-dom";

export default function Profile() {
  const { userId } = useParams();
  return <h1>Profile: {userId}</h1>;
}
