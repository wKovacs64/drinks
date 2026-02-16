import bgImg from '#/app/assets/images/background-768.jpg';
import bgImgLg from '#/app/assets/images/background-2078.jpg';

export const backgroundImageStyles = `
  .bg-app-image {
    background-image: url('${bgImg}');
  }

  @media (min-width: 1024px) {
    .bg-app-image {
      background-image: url('${bgImgLg}');
    }
  }
`;
