import React from 'react';
import classNames from 'classnames';
import resl from 'resl';

class Header extends React.PureComponent {
  render () {
    if (this.props.bgImageSrc) {
      var styleProps = {};
      styleProps.backgroundImage = 'url('+this.props.bgImageSrc+')';
    }
    return (
      <div className={classNames('article-header')}>
        {this.props.bgImageSrc && (<div className="article-header__image" style={styleProps}/>)}
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
