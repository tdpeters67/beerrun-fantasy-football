// Server-side data source. The build script writes public/fantasy-data.json;
// importing it here bakes the content into the server render so text shows up
// in the initial HTML (no client-side loading flash).
import data from "../../public/fantasy-data.json";

export default data;
