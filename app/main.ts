import * as fs from "fs";
import * as zlib from "zlib";
import {createHash} from 'crypto';

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
      process.stdout.write(realContent);
    } catch (err) {
      console.error("Error reading and decompressing blob");
    }

    break;
  
  case "hash-object":
    // Read file content
    const fileContent = fs.readFileSync(args[2]); // buffer
    
    // Create header
    // Prepend \0
    const header = Buffer.from(`blob ${fileContent.length}\0`);
    
    // Join fileContent and header
    const gitObject = Buffer.concat([header, fileContent]);
    
    // hash gitObject
    const hash = createHash('sha1')
      .update(gitObject) // Input the data that needs hashing
      .digest('hex') // Calculates digest and outs 'hex' format
    
      // Compress content
    const compressedContent = zlib.deflateSync(gitObject);

    // Write hashed content to .git/objects
    // Create paths to input compressed content later
    const hashedDirectoryName = hash.slice(0,2);
    const hashedFileName = hash.slice(2);
    const dirPath = `.git/objects/${hashedDirectoryName}`;
    const filePath = `${dirPath}/${hashedFileName}`;
    
    // Create directories and files
    // input compressed content
    fs.mkdirSync(`${dirPath}`, { recursive: true });
    fs.writeFileSync(filePath, compressedContent);
  
    // Log hash
    console.log(hash);

    break;

  default:
    throw new Error(`Unknown command ${command}`);
}
