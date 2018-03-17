import React from 'react';
import classNames from 'classnames';
import resl from 'resl';

class Header extends React.PureComponent {
	constructor (props) {
    super(props);

    this.state = {
      bgImageSrc: this.props.bgImagePreviewSrc || this.props.bgImageSrc,
      isPreview: this.props.bgImagePreviewSrc ? true : false
    };
  }

  componentDidMount () {
    if (this.props.bgImageSrc) {
      resl({
        manifest: {
          bg: {
            src: this.props.bgImageSrc,
            type: 'image',
          }
        },
        onDone: () => {
          this.setState({
            bgImageSrc: this.props.bgImageSrc,
            isPreview: false
          });
        }
      });
    }
  }

  render () {
    var styleProps = {};
    if (this.state.bgImageSrc) {
      styleProps.backgroundImage = 'url('+this.state.bgImageSrc+')';
    }
    return (
      <div className={classNames('article-header', {
          'article-header--has-image': !!this.state.bgImageSrc,
          'article-header--has-image-preview': this.state.isPreview
        })}>
        {this.state.bgImageSrc && (<div className="article-header__image" style={styleProps}/>)}
        <div className={'article-header__content'}>
          <h1 className={'hed'}>
            {this.props.title}
          </h1>
          {
            this.props.subtitle && (
              <h2 className={'dek'}>
                {this.props.subtitle}
              </h2>
            )
          }
          {
            this.props.author && (
              <div className={'byline'}>
                <a href={this.props.authorLink}>{this.props.author}</a>
              </div>
            )
          }
          {
            this.props.date && (
              <div className={'published-at'}>
                {this.props.date}
              </div>
            )
          }
        </div>
      </div>
    );
  }
}

export default Header;
