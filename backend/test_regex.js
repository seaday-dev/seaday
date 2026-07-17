const tests = [
  "Pirireis Plajı",
  "Mersin, Akdeniz",
  "Gümüşkum Plajı, 75.Yıl, Mezitli",
  "Kaputaş Koyu",
  "Susanoğlu"
];
const regex = /(^|\s|\W)(plaj|plajı|koy|koyu|sahil|sahili|deniz|beach|bük|bükü)($|\s|\W)/i;

tests.forEach(t => console.log(t, regex.test(t)));
