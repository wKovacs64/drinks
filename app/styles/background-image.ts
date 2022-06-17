import bgImg from '~/images/background-768.jpg';
import bgImgLg from '~/images/background-2078.jpg';

export const backgroundImageStyles = `
  html {
    background-image: url('${bgImg}');
  }

  @media (min-width: 1024px) {
    html {
      background-image: url('${bgImgLg}');
    }
  }
`;
