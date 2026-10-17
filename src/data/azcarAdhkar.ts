export type DhikrCategory = 'morning' | 'evening' | 'after_prayer';
export interface Dhikr { id: string; category: DhikrCategory; text: string; count: number; virtue?: string; source?: string; }

export const morningAdhkar: Dhikr[] = [
  {
    id: 'm1',
    category: 'morning',
    text: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
    count: 1,
    source: 'مسلم',
  },
  {
    id: 'm2',
    category: 'morning',
    text: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ',
    count: 1,
    source: 'الترمذي',
  },
  {
    id: 'm3',
    category: 'morning',
    text: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ',
    count: 1,
    virtue: 'سيد الاستغفار',
    source: 'البخاري',
  },
  {
    id: 'm4',
    category: 'morning',
    text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    count: 100,
    virtue: 'حُطَّتْ خطاياه وإن كانت مثل زبد البحر',
    source: 'متفق عليه',
  },
  {
    id: 'm5',
    category: 'morning',
    text: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    count: 10,
    source: 'البخاري',
  },
  {
    id: 'm6',
    category: 'morning',
    text: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    count: 3,
    virtue: 'لم يضره شيء',
    source: 'الترمذي',
  },
  {
    id: 'm7',
    category: 'morning',
    text: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا',
    count: 3,
    source: 'الترمذي',
  },
  {
    id: 'm8',
    category: 'morning',
    text: 'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
    count: 7,
    source: 'أبو داود',
  },
  {
    id: 'm9',
    category: 'morning',
    text: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ',
    count: 3,
    source: 'الترمذي',
  },
  {
    id: 'm10',
    category: 'morning',
    text: 'أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ ﷺ',
    count: 1,
    source: 'أحمد',
  },
];

export const eveningAdhkar: Dhikr[] = [
  {
    id: 'e1',
    category: 'evening',
    text: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
    count: 1,
    source: 'مسلم',
  },
  {
    id: 'e2',
    category: 'evening',
    text: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ',
    count: 1,
    source: 'الترمذي',
  },
  {
    id: 'e3',
    category: 'evening',
    text: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    count: 3,
    virtue: 'لم يضره شيء تلك الليلة',
    source: 'مسلم',
  },
  {
    id: 'e4',
    category: 'evening',
    text: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ',
    count: 1,
    virtue: 'سيد الاستغفار',
    source: 'البخاري',
  },
  {
    id: 'e5',
    category: 'evening',
    text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    count: 100,
    source: 'متفق عليه',
  },
  {
    id: 'e6',
    category: 'evening',
    text: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    count: 3,
    source: 'الترمذي',
  },
  {
    id: 'e7',
    category: 'evening',
    text: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ',
    count: 3,
    source: 'البخاري',
  },
  {
    id: 'e8',
    category: 'evening',
    text: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    count: 10,
    source: 'البخاري',
  },
  {
    id: 'e9',
    category: 'evening',
    text: 'أَمْسَيْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ ﷺ',
    count: 1,
    source: 'أحمد',
  },
];

export const afterPrayerAdhkar: Dhikr[] = [
  {
    id: 'a1',
    category: 'after_prayer',
    text: 'أَسْتَغْفِرُ اللَّهَ',
    count: 3,
    source: 'متفق عليه',
  },
  {
    id: 'a2',
    category: 'after_prayer',
    text: 'اللَّهُمَّ أَنْتَ السَّلَامُ، وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
    count: 1,
    source: 'مسلم',
  },
  {
    id: 'a3',
    category: 'after_prayer',
    text: 'سُبْحَانَ اللَّهِ',
    count: 33,
    source: 'مسلم',
  },
  {
    id: 'a4',
    category: 'after_prayer',
    text: 'الْحَمْدُ لِلَّهِ',
    count: 33,
    source: 'مسلم',
  },
  {
    id: 'a5',
    category: 'after_prayer',
    text: 'اللَّهُ أَكْبَرُ',
    count: 33,
    source: 'مسلم',
  },
  {
    id: 'a6',
    category: 'after_prayer',
    text: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    count: 1,
    virtue: 'تمام المائة، غُفرت خطاياه',
    source: 'مسلم',
  },
  {
    id: 'a7',
    category: 'after_prayer',
    text: 'اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ',
    count: 1,
    source: 'متفق عليه',
  },
  {
    id: 'a8',
    category: 'after_prayer',
    text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
    count: 100,
    virtue: 'كلمتان خفيفتان على اللسان، ثقيلتان في الميزان',
    source: 'البخاري',
  },
];

export const allAdhkar: Dhikr[] = [...morningAdhkar, ...eveningAdhkar, ...afterPrayerAdhkar];

export const dhikrCategoryLabels: Record<string, string> = {
  morning: 'أذكار الصباح',
  evening: 'أذكار المساء',
  after_prayer: 'أذكار بعد الصلاة',
};

export const dhikrCategoryIcons: Record<string, string> = {
  morning: 'sunrise',
  evening: 'moon',
  after_prayer: 'kaaba',
};
