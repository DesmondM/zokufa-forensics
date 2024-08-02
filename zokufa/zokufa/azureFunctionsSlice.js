import { createSlice, createEntityAdapter } from '@reduxjs/toolkit'
//import { odataFetch } from '../adapter/OdataFetch'
import { toolkitFetch } from '../adapter/ToolkitApi'
import { odataEncodeKey } from '../utils/utilities'
import moment from 'moment'

const azureFunctionAppsAdapter = createEntityAdapter({
    selectId: (functionApp) => functionApp.Name,
    sortComparer: (a, b) => a.Name.localeCompare(b.Name)
})

const initialState = azureFunctionAppsAdapter.getInitialState({
    projectName: '',
    status: 'idle',
    error: null,
    deleting: false,
    creating: false,
    publishing: false,
    publishingError: null,
    fetchError: null,
    createError: null,
    createSuccess: false
})

const azureFunctionAppsSlice = createSlice({
    name: 'azureFunctionApps',
    initialState,
    reducers: {

        setFunctionApps(state, action) {
            const { projectName } = action.payload
            state.projectName = projectName
            azureFunctionAppsAdapter.upsertMany(state, action.payload.functionApps)
            state.status = 'loaded'
        },
        clearFunctionApps(state, actions) {
            azureFunctionAppsAdapter.removeAll(state)
        },
        creatingFunctionApp(state, actions) {
            state.creating = true
        },
        publishingFunctionApp(state, actions) {
            state.publishing = true
        },
        publishedFunctionApp(state, actions) {
            state.publishing = false
        },
        publishingFunctionAppError(state, actions) {
            state.publishingError = actions.payload
        },
        creatingFunctionAppComplete(state, actions) {
            state.creating = false
        },
        deletingFunctionApp(state, actions) {
            state.deleting = true
        },
        deletingFunctionAppComplete(state, actions) {
            state.deleting = false
        },
        hasFetchError(state, actions) {
            state.status = 'error'
            state.fetchError = actions.payload
        },
        deleteFunctionAppError(state, actions) {
            state.deleting = false
            state.error= 'error'
        },
        createFunctionAppError(state, actions) {
            state.createError = actions.payload
        },
        clearFunctionAppErrors(state, actions) {
            state.createError = null
            state.publishingError = null
        },
        succesfulFunctionAppCreate(state, actions) {
            state.createSuccess = true
        },
        createFunctionAppPublished(state, actions) {
            state.createSuccess = false
        },
        
        azureFunctionAppAdded: azureFunctionAppsAdapter.addOne,
        azureFunctionAppDeleted: azureFunctionAppsAdapter.removeOne,
        azureFunctionAppUpdated: azureFunctionAppsAdapter.updateOne,
        //associationDeleted: associationsAdapter.removeOne,
    }
})

export const {
    setFunctionApps, clearFunctionApps, azureFunctionAppAdded, azureFunctionAppDeleted, azureFunctionAppUpdated,  deletingFunctionApp, deletingFunctionAppComplete, 
    creatingFunctionApp, creatingFunctionAppComplete, publishingFunctionApp, publishedFunctionApp, publishingFunctionAppError, hasFetchError, deleteFunctionAppError, processingFunctionAppError, 
    createFunctionAppError, clearFunctionAppErrors, succesfulFunctionAppCreate
    //associationAdded, associationUpdated, associationDeleted
} = azureFunctionAppsSlice.actions

export default azureFunctionAppsSlice.reducer

export const {
    //selectEntities: selectAllAssociationsLookup,
    //selectAll: selectAllAssociations,
    //selectById: selectAssociationById,
    //selectIds: selectAssociationIds
} = azureFunctionAppsAdapter.getSelectors(state => state.azureFunctionApps)

export function fetchProjectFunctionApps(projectName) {
    return function (dispatch, getState) {
        const state = getState()
        state.status = 'loading'
        if (state.azureFunctionApps.projectName !== projectName) {
            dispatch(clearFunctionApps())
        }
        return toolkitFetch(state.login.authHeader, 'GET', `ToolkitProject('${projectName}')/FunctionApps?$filter=Deleted eq null&$expand=Publishes`,
            null, null, (res, error) => {
                console.log(res, error)
                if (res instanceof Array) {
                    dispatch(setFunctionApps({ projectName: projectName, functionApps: res }))
                } else if (error) {
                    console.log('ERROR: ' + error)
                    //dispatch(failGetProjectList({ error: error }))
                    dispatch(hasFetchError({ error: error }))
                }
            })
    }
}

export function createProjectFunctionApp(projectName, body) {
    return function (dispatch, getState) {
        const state = getState()
        dispatch(creatingFunctionApp())
        return toolkitFetch(state.login.authHeader, 'POST', `ToolkitProject('${projectName}')/FunctionApps`,
            null, body, (res, error) => {
                console.log(res, error)
                if (res) {
                    dispatch(azureFunctionAppAdded(res))
                    dispatch(creatingFunctionAppComplete())
                    dispatch(succesfulFunctionAppCreate())
                    dispatch(clearFunctionAppErrors())
                } else if (error) {
                    console.log('ERROR: ' + error)
                    //dispatch(failGetProjectList({ error: error }))
                    dispatch(createFunctionAppError({ error: error }))
                    dispatch(creatingFunctionAppComplete())
                }
            })
    }
}

export function deleteProjectFunctionApp(functionName, projectName) {
    return function (dispatch, getState) {
        const state = getState()
        const body = {
            Deleted: moment.utc().toJSON(),
            AzureAppStatus:'Deleted'
        }
        dispatch(deletingFunctionApp())
        return toolkitFetch(state.login.authHeader, 'PATCH', `ToolkitAzureFunctionApp(Name=${odataEncodeKey(functionName)},ProjectName=${odataEncodeKey(projectName)})`,
            null, body, (res, error) => {
                console.log(res, error)
                if (res) {
                    dispatch(azureFunctionAppDeleted(functionName))
                    dispatch(deletingFunctionAppComplete())
                } else if (error) {
                    console.log('ERROR: ' + error)
                    //dispatch(failGetProjectList({ error: error }))
                    dispatch(deleteFunctionAppError({ error: error }))
                    dispatch(deletingFunctionAppComplete())
                }
            })
    }
}

export function publishProjectFunctionApp(functionName, projectName, body) {
    return function (dispatch, getState) {
        const state = getState()
        body.ZipFileSha = body.ZipFileSha.replace('http://localhost:8888', 'https://toolkitv3.comunity.me')
        dispatch(publishingFunctionApp())
        return toolkitFetch(state.login.authHeader, 'POST', `ToolkitAzureFunctionApp(Name=${odataEncodeKey(functionName)},ProjectName=${odataEncodeKey(projectName)})/Publishes`,
            null, body, (res, error) => {
                console.log(res, error)
                if (res) {
                    //dispatch(azureFunctionAppAdded(res))
                    // dispatch(azureFunctionAppUpdated(res))
                    dispatch(fetchProjectFunctionApps(projectName))
                    dispatch(publishedFunctionApp())
                } else if (error) {
                    console.log('ERROR: ' + error)
                    //dispatch(failGetProjectList({ error: error }))
                    dispatch(publishedFunctionApp())
                    dispatch(publishingFunctionAppError({error:error}))
                }
            })
    }
}

