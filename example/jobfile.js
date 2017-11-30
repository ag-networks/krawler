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
  hooks: {
    tasks: {
      after: {
        // Because each task is not a JSON object but a GeoTiff we need to convert to JSON before exporting them to CSV
        readGeoTiff: {
          dataPath: 'result.data',
          fields: ['bbox', 'value']
        },
        // For debug purpose
        /*
        writeJson: {}
        */
        writeCSV: {
          dataPath: 'result.data',
          fields: [
            {
              label: 'Latmin',
              value: 'bbox[1]'
            },
            {
              label: 'Lonmin',
              value: 'bbox[0]'
            },
            {
              label: 'Latmax',
              value: 'bbox[3]'
            },
            {
              label: 'Lonmax',
              value: 'bbox[2]'
            },
            {
              label: 'Elev',
              value: 'value'
            }
          ]
        }
      }
    },
    jobs: {
      before: {
        basicAuth: { type: 'Proxy-Authorization', optionsPath: 'taskTemplate.options' },
        generateGrid: {},
        generateGridTasks: { resample: true }
      },
      after: {
        mergeCSV: { headers: true }
      }
    }
  }
  
  // This hook setup is to perform DEM data download of each grid cell independently
  // The problem is that processing time might be too long on high resolution grids
  /*
  hooks: {
    tasks: {
      before: {
        // Could be set for each task but better to set it on template if all tasks use the same options
        // basicAuth: { type: 'Proxy-Authorization' }
      },
      after: {
        // If we don't resample we need to compute max value on a zone because we don't have a single value anymore
        // If we resample we could use the value directly by converting to JSON
        computeStatistics: { max: true }
      }
    },
    jobs: {
      before: {
        basicAuth: { type: 'Proxy-Authorization', optionsPath: 'taskTemplate.options' },
        generateGrid: {},
        generateGridTasks: { resample: true }
      },
      after: {
        // Because each task is a JSON object wecan directly export them to CSV
        writeCSV: {
          fields: [
            {
              label: 'Latmin',
              value: 'bbox[1]'
            },
            {
              label: 'Lonmin',
              value: 'bbox[0]'
            },
            {
              label: 'Latmax',
              value: 'bbox[3]'
            },
            {
              label: 'Lonmax',
              value: 'bbox[2]'
            },
            {
              label: 'Elev',
              value: 'max'
            }
          ]
        }
      }
    }
  }
  */
}