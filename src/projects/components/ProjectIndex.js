import React from 'react';
import projectsIndex from '../index.json';

class ProjectIndex extends React.Component {
  render () {
    return <div className="projects">{
      projectsIndex.map(project => (
        <a
          className="project"
          key={project.id}
          href={project.path}
        >
          <img src={project.thumbnailPath}/>
          <span className="project__overlay">
            <span className="project__meta">
              <span className="project__title">{project.title}</span>
              {project.description && (
                <span className="project__description">{project.description}</span>
              )}
            </span>
          </span>
        </a>
      ))
    }</div>;
  }
}

export default ProjectIndex;
