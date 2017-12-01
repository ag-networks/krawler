module.exports = {
  options: {
    // If we use a download task per grid cell this should be high like 50,
    // much lower if we use a download task per grid block
    workersLimit: 4
  },
  store: {
    id: 'job-store',
    type: 'fs',
    options: { path: './data' }
  },
  taskTemplate: {
    store: 'job-store',
    id: '<%= jobId %>-<%= taskId %>.tif',
    type: 'wcs',
    options: {
      url: 'http://geoserver.kalisio.xyz/geoserver/Kalisio/wcs',
      version: '2.0.1',
      format: 'image/tiff',
      coverageid: 'Kalisio:SRTM',
      longitudeLabel: 'Long',
      latitudeLabel: 'Lat',
      auth: {
        user: process.env.USER_NAME,
        password: process.env.USER_PASSWORD
      }
    }
  },
  // This hook setup is to perform DEM data download of the grid by block
  // In this case a CSV is generated by block and all must be marged at the end
  // The job needs to include a blockSize parameter
  hooks: require('./hooks-blocks')
  // This hook setup is to perform DEM data download of each grid cell independently
  // The problem is that processing time might be too long on high resolution grids
  //hooks: require('./hooks')
}
