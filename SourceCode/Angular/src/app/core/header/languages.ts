// export class Languages {
//     static languages: LanguageFlag[] = [
//         {
//             lang: 'en',
//             name: 'English',
//             flag: '../../../images/flags/united-states.svg',
//         },
//         {
//             lang: 'cn',
//             name: 'Chinese',
//             flag: '../../../images/flags/china.svg',
//         },
//         {
//             lang: 'es',
//             name: 'Spanish ',
//             flag: '../../../images/flags/france.svg',
//         },
//         {
//             lang: 'ar',
//             name: 'Arabic ',
//             flag: '../../../images/flags/saudi-arabia.svg',
//         },
//         {
//             lang: 'ru',
//             name: 'Russian',
//             flag: '../../../images/flags/russia.svg',
//         },
//         {
//             lang: 'ja',
//             name: 'Japanese',
//             flag: '../../../images/flags/japan.svg',
//         },
//         {
//             lang: 'de',
//             name: 'German',
//             flag: '../../../images/flags/germany.png',
//         }, {
//             lang: 'fr',
//             name: 'French',
//             flag: '../../../images/flags/french.png'
//         },
//     ];
// }

export interface LanguageFlag {
  code: string;
  name: string;
  imageUrl: string;
  isrtl: boolean;
  active?: boolean;
}
