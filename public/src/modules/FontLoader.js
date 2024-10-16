export default class FontLoader {
    constructor(src, name) {
        let loadFont = new FontFace(name, 'url('+src+')');

        loadFont.load().then(function(font){
            document.fonts.add(font);
        }).catch(function(error){
            console.log('Font not loaded', error);
        });

    }
}