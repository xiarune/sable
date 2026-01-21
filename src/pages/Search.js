import { useSearchParams } from "react-router-dom";

export default function Search() {
  const [sp] = useSearchParams();
  return (
    <div>
      <h1>Search</h1>
      <p>Query: {sp.get("q") || ""}</p>
    </div>
  );
}
