# istwitterscreenshot

istwitterscreenshot is a library that attempts to determine if an image is a twitter screenshot.

as twitter becomes worse and worse, you might be looking for a way to hide twitter screenshots on external sites, such as image boards, forums, chatrooms, etc. 

using this library, you can request for an image to be evaluated, and if the function returns true, you can hide that image and not have to look at it any more.

it occasionally results in false positives and false negatives but generally speaking it works pretty well; it might be worth using if you are really fed up with twitter screenshots.

## usage

create an instance of istwitterscreenshot (one time):

    const istwitterscreenshot = new Istwitterscreenshot
    
then make as many requests as needed (ideally, you have an image in its native resolution *and* a thumbnail version of the image, which is typically the case with image boards):

    const thumbnailURL = "http://localhost/thumbnail.jpg"
    const fullsizeURL = "http://localhost/fullsize.jpg"

    const image = new Image

    image.onload = async function() {
      const response = await istwitterscreenshot.request(image, fullsizeURL)
      console.log(response) // true
    }
    image.src = thumbnailURL
    
## notes

see [NOTES.md](https://github.com/fanfare/istwitterscreenshot/blob/master/NOTES.md) for additional info.
