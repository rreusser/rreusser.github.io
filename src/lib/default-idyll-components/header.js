import React from 'react';
import classNames from 'classnames';
import resl from 'resl';

class Header extends React.PureComponent {
	constructor (props) {
    super(props);

    this.state = {isLoaded: false};
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
          this.setState({isLoaded: true});
        }
      });
    }
  }

  render () {
    if (this.props.bgImagePreviewSrc) {
      var previewStyleProps = {};
      previewStyleProps.backgroundImage = 'url('+this.props.bgImagePreviewSrc+')';
    }
    if (this.props.bgImageSrc) {
      var styleProps = {};
      styleProps.backgroundImage = 'url('+this.props.bgImageSrc+')';
    }
    return (
      <div className={classNames('article-header', {
          'article-header--has-image': !!this.props.bgImageSrc,
          'article-header--has-image-preview': !!this.props.bgImagePreviewSrc
        })}>
        {(this.props.bgImageSrc && this.state.isLoaded) && (<div className="article-header__image" style={styleProps}/>)}
        {this.props.bgImagePreviewSrc && (<div className={classNames("article-header__image-preview", {"article-header__image-preview--hidden": !!this.state.isLoaded})} style={previewStyleProps}/>)}
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
