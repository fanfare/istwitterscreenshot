# istwitterscreenshot
#####
create an instance of istwitterscreenshot:

    const istwitterscreenshot = new Istwitterscreenshot
    
then make as many requests as needed

    const thumbnailURL = "http://localhost/thumbnail.jpg"
    const optionalFullsizeURL = "http://localhost/fullsize.jpg"

    const thumbnail = new Image

    thumbnail.onload = async function() {
      const result = await istwitterscreenshot(thumbnail, optionalFullsizeURL)
      if (result) {
        console.log("true")
      }
      else {
        console.log("false")
      }
    }
    thumbnail.src = thumbURL