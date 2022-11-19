## notes

it is important to note that the image(s) must be from the same domain as the page you are on -- to circumvent this, the library can be run from within a browser extension's background script, which is not limited by CORS restrictions, assuming the `"permissions"` key in the `manifest.json` includes the appropriate domains and/or `"<all_urls>"`. you may also need to set the `image` variable to have a `crossOrigin` property of `"anonymous"`, e.g.:

    const image = new Image
    image.crossOrigin = "anonymous"
    
additionally, if you only have *one* version of an image (either *only* the thumbnail, or *only* the fullsize version), set whatever image you have to be the first argument, and set the second argument to be `null`: 

    const URL = "http://localhost/someimage.jpg"
    
    const image = new Image

    image.onload = async function() {
      const response = await istwitterscreenshot.request(image, null)
      console.log(response) // true
    }
    image.src = URL

## misc

finally, you can also cancel requests after they have been made via `istwitterscreenshot.request` in case you need to prevent the full size URL from eventually being downloaded and evaluated:

before making a request via `istwitterscreenshot.request`, obtain a cancel token -- this token can be used on one (or multiple) requests to cancel *all* requests made using the same token:

    const cancelToken = istwitterscreenshot.obtainCancelToken()
    
then supply that cancel token when making a request:

    const response = await istwitterscreenshot.request(image, optionalFullsizeURL, cancelToken)
    
and later if you need to cancel that request before it has returned a response:

    istwitterscreenshot.cancel(cancelToken)
    
this cancellation feature is useful for browser extensions as you may need to prevent (no longer needed) full size images from being downloaded and evaluated after a user has navigated away from a page (closed a tab).

the cancelled asynchronous request made via `istwitterscreenshot.request` will return `false` as soon as possible.
