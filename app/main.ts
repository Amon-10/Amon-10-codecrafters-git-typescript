import * as fs from "fs";
import * as zlib from "zlib";

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "init":
    // You can use print statements as follows for debugging, they'll be visible when running tests.
    console.error("Logs from your program will appear here!");

    // TODO: Uncomment the code below to pass the first stage
    fs.mkdirSync(".git", { recursive: true });
    fs.mkdirSync(".git/objects", { recursive: true });
    fs.mkdirSync(".git/refs", { recursive: true });
    fs.writeFileSync(".git/HEAD", "ref: refs/heads/main\n");
    console.log("Initialized git directory");
    break;
  
  case "cat-file":
    const directory = args[2].slice(0,2);
    const fileName =  args[2].slice(2);
    
    try {
      // Read blob 
      const content = fs.readFileSync(`.git/objects/${directory}/${fileName}`);

      // Decompress
      // Use .unzipSync when unsure whether header is zlib(buffer) or gzlib(.gz)
      const decompressContent = zlib.unzipSync(content); // we could've used .inflateSync since we are dealing with zlib(buffer)

      // Extract content
      // ignore header(blob <size>\0)
      const realContent = decompressContent.toString().split("\0")[1];
      console.log(realContent);
    } catch (err) {
      console.error("Error reading and decompressing blob");
    }

    break;
  default:
    throw new Error(`Unknown command ${command}`);
}
