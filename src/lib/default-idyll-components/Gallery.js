import React from 'react';

class Gallery extends React.Component {
  render () {
    return <div className="projects">{
      this.props.contents.map((image, i) => {
        var imagePath = this.props.basePath + image.href;
        var thumbnailPath = imagePath.replace(/\.(jpg)/, '-thumbnail.$1');
        return <a
          className="project"
          key={i}
          href={imagePath}
        >
          <img src={thumbnailPath}/>
          <span className="project__overlay">
            <span className="project__meta">
              {image.title && (<span className="project__title">{image.title}</span>)}
              {image.description && (
                <span className="project__description">{image.description}</span>
              )}
            </span>
          </span>
        </a>
      })
    }</div>;
  }
}

export default Gallery;
