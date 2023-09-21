# THIS REPOSITORY HAS MOVED. PLEASE USE https://git.sr.ht/~fanfare/istwitterscreenshot

This repository has moved and will no longer be maintained on GitHub. For the latest updates, please use https://git.sr.ht/~fanfare/istwitterscreenshot

This account will no longer have access to GitHub after "two-factor authentication" becomes enforced September 27, 2023.

mirror: https://jollo.org/LNT/home/fanfare/git.html

---

# istwitterscreenshot

![detecting screenshot](https://i.jollo.org/qGl0j0fP.png)

istwitterscreenshot is a library that attempts to determine if an image is a twitter screenshot.

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
    
## how it works

the library will first evaluate the thumbnail provided and make a guess as to whether or not it is a twitter screenshot based *soley* on the thumbnail.

if the thumbnail is very likely a twitter screenshot, it will return true, but if the thumbnail is very unlikely a twitter screenshot, it will return false.

if it is uncertain as to whether or not the thumbnail is twitter screenshot, it will *only then* download the full size image to perform additional tests to make a final assessment.

## demonstration

an image board [WebExtension](https://github.com/newscoffee/hide-twitter-screenshot-threads) was created to demonstrate the functionality of istwitterscreenshot.
    
## notes

see [NOTES.md](https://github.com/fanfare/istwitterscreenshot/blob/master/NOTES.md) for additional usage info.
