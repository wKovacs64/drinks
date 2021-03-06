import * as React from 'react';
import PropTypes from 'prop-types';
import { IconContext } from 'react-icons';
import { Helmet } from 'react-helmet';
import { css, Global, ClassNames } from '@emotion/react';
import { SkipNavLink } from '@reach/skip-nav';
import { useStaticQuery, graphql } from 'gatsby';
import { getSrc } from 'gatsby-plugin-image';
import FeedbackDialog from './feedback-dialog';
import Header from './header';
import Main from './main';
import Footer from './footer';
import { mq } from '../utils';

function Layout({ children }) {
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const {
    site: { siteMetadata },
    file: {
      childImageSharp: { bgImageSm, bgImageLg },
    },
  } = useStaticQuery(graphql`
    {
      site {
        siteMetadata {
          title
          buildInfo {
            commit
          }
        }
      }
      file(relativePath: { eq: "background.jpg" }) {
        childImageSharp {
          bgImageSm: gatsbyImageData(width: 768, layout: FIXED)
          bgImageLg: gatsbyImageData(width: 2078, layout: FIXED)
        }
      }
    }
  `);

  function handleFeedbackToggle() {
    setFeedbackOpen((open) => !open);
  }

  return (
    <ClassNames>
      {({ css: classNameFromCss }) => (
        <IconContext.Provider
          value={{
            className: classNameFromCss`
              vertical-align: middle;
            `,
          }}
        >
          <Global
            styles={css`
              @font-face {
                font-family: 'Source Sans Pro';
                src: local('Source Sans Pro');
              }
              html {
                background-color: #242424;
                background-repeat: no-repeat;
                background-size: cover;
                background-attachment: fixed;
                background-position: center;
                background-image: url(${getSrc(bgImageSm)});
                ${mq.lg} {
                  background-image: url(${getSrc(bgImageLg)});
                }
              }
              body {
                font-family: 'Source Sans Pro', -apple-system,
                  BlinkMacSystemFont, 'avenir next', avenir, 'helvetica neue',
                  helvetica, ubuntu, roboto, noto, 'segoe ui', arial, sans-serif;
                font-weight: 300;
              }
              /*
               * HACK: abuse specificity to force styles overridden by
               * @reach/dialog -> react-remove-scroll -> react-remove-scroll-bar
               * to avoid a content jump when showing the feedback form.
               */
              html > body {
                overflow-y: scroll !important;
                margin: 0 !important;
              }
              #gatsby-noscript {
                display: none;
              }
            `}
          />
          <Helmet
            htmlAttributes={{
              lang: 'en',
              'data-commit': siteMetadata.buildInfo.commit,
            }}
          />
          <FeedbackDialog
            isOpen={feedbackOpen}
            onDismiss={handleFeedbackToggle}
          />
          <SkipNavLink />
          <div
            css={css`
              display: flex;
              flex-direction: column;
              min-height: 100vh;
            `}
          >
            <Header siteTitle={siteMetadata.title} />
            <noscript>
              <p
                css={css`
                  color: #f4f4f4;
                  margin-bottom: 0;
                  padding: 1rem;
                  ${mq.sm} {
                    padding: 0;
                    text-align: center;
                  }
                `}
              >
                Please enable JavaScript for full site functionality.
              </p>
            </noscript>
            <Main>{children}</Main>
            <Footer onFeedbackClick={handleFeedbackToggle} />
          </div>
        </IconContext.Provider>
      )}
    </ClassNames>
  );
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;
