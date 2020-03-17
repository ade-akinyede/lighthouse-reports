const lighthouse = require('lighthouse')
const chromeLauncher = require('chrome-launcher')
const argv = require('yargs').argv
const url = require('url')
const fs = require('fs')

async function launchChromeAndRunLighthouse(urlArg) {
    try {
        console.log("Launching chrome...")
        const chromeInstance = await chromeLauncher.launch()

        console.log("Chrome launched. Port is ---> ", chromeInstance.port)
        const opts = { port: chromeInstance.port }

        console.log("Starting Lighthouse report for url ---> ", urlArg)
        const lighthouseResult = await lighthouse(urlArg, opts)

        console.log("Report completed. Closing chrome...")
        await chromeInstance.kill()

        // Return both JS and JSON to avoid unnecessary parsing
        return {
            js: lighthouseResult.lhr,
            json: lighthouseResult.report
        }
        
    } catch(err) {
        console.error("An error occurred. See details below:");
        console.error(err)
        throw "Aborting"
    }
}

function stripWWWFromURLObject(urlObj = "") {
    if (urlObj instanceof URL) {
        return urlObj.host.replace('www.', '')
    } else {
        throw "Invalid type. Arg must be URL object"
    }
}

function replaceSlashesWithUnderscore(path = "") {
    return path.replace(/\//g, "_")
}

if (argv.url) {
    const urlObj = new URL(argv.url)
    // Get rid of www part in the URL
    let dirName = stripWWWFromURLObject(urlObj)

    // Replace slashes with underscores if the URL has a pathname, as slashes are invalid 
    // character for directory names, and append to dirName
    if (urlObj.pathname !== "/") {
        dirName += replaceSlashesWithUnderscore(urlObj.pathname)
    }

    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName)
    }

    launchChromeAndRunLighthouse(argv.url)
    .then(results => {
        console.log("Result retrieved. Writing to file...")
        // Construct file name, swapping any colons (:) for underscores (_) so it plays nice with the Windows file system.
        const fileName = `${dirName}/${results.js["fetchTime"].replace(/:/g, "_")}.json`
        console.log("Setting file name to ", fileName)

        fs.writeFile(fileName, results.json, err => {
            if (err) throw err

            console.log("File written successfully.")
            console.log("Open https://googlechrome.github.io/lighthouse/viewer/ to view the file.");
        })
    })

} else {
    throw "Missing URL argument for lighthouse. An example of the correct format is --> node lh.js --url https://www.wikipedia.com"
}
