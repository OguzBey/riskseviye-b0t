# Akıllı Fon Risk Seviyes Botu

## Kullanımı Hakkında:

- **package.json** içerisindeki gerekli modüllerin kurulması.
- **config.js** içerisindeki **databaseName**, **connectURI** gibi değerlerin düzeltilmesi.
- Botun başlatılması: ```node bot.js``` veya ```npm start```

### Not:
- ```kapUrl``` değeri domain adresinin değişme ihtimali düşünülerek **config.js** içerisinde konulmuştur. Domain değişmedikçe bu değere dokunulmamalıdır.


## Botun Görevi Hakkında:

- Bot mevcut mongo veritabanındaki risk seviyelerini fon kodlarına göre günceller.
- Modülerdir dilenirse methodlar export edilip modül olarak kullanılabilir.
- Hata çıkma ihtimalleri düşünülmüştür önemli durumlarda mail atmaktadır.
