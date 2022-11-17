# istwitterscreenshot

![twitter screencap vs regular image](https://i.jollo.org/MTmvFT1h.png)

istwitterscreenshot is a library that attempts to determine if an image is a twitter screenshot.

this might be useful if you are looking for a way to hide twitter screenshots on external sites, such as image boards, forums, chatrooms, etc. 

using this library, you can request for an image to be evaluated, and if the function returns true, you can hide that image and not have to look at it any more.

## usage

create an instance of istwitterscreenshot (one time):

    const istwitterscreenshot = new Istwitterscreenshot
    
then make as many requests as needed (ideally, you have an image in its native resolution *and* a thumbnail version of the image):

    const thumbnailURL = "http://localhost/thumbnail.jpg"
    const fullsizeURL = "http://localhost/fullsize.jpg"

    const image = new Image

    image.onload = async function() {
      const response = await istwitterscreenshot.request(image, fullsizeURL)
      console.log(response) // true
    }
    image.src = thumbnailURL
    
if you only have *one* version of an image (either *only* the thumbnail, or *only* the fullsize version), set whatever image you have to be the first argument, and set the second argument to be `null`: 

    const URL = "http://localhost/someimage.jpg"
    
    const image = new Image

    image.onload = async function() {
      const response = await istwitterscreenshot.request(image, null)
      console.log(response) // true
    }
    image.src = URL
    
## how it works

the library will first evaluate the thumbnail provided and make a guess as to whether or not it is a twitter screenshot based *soley* on the thumbnail.

if the thumbnail is very likely a twitter screenshot, it will return true, but if the thumbnail is very unlikely a twitter screenshot, it will return false.

if it is uncertain as to whether or not the thumbnail is twitter screenshot, it will *only then* download the full size image to perform additional tests to make a final assessment.
    
## notes

it is important to note that the image(s) must be from the same domain as the page you are on -- to circumvent this, the library can be run from within a browser extension's background script, which is not limited by CORS restrictions, assuming the `"permissions"` key in the `manifest.json` includes the appropriate domains and/or `"<all_urls>"`. you may also need to set the `image` variable to have a `crossOrigin` property of `"anonymous"`, e.g.:

    const image = new Image
    image.crossOrigin = "anonymous"

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
