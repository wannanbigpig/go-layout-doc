export function filterErrorGroups(groups, query = '') {
    const search = query.trim().toLowerCase()
    const isCommon = (group) => group.file.split(/[\\/]/).at(-1) === 'code_common.go'
    return [...groups]
        .sort((a, b) => Number(isCommon(b)) - Number(isCommon(a)))
        .map((group) => ({
            ...group,
            codes: group.codes.filter((code) => `${code.code} ${code.name} ${code.description || ''}`.toLowerCase().includes(search))
        }))
        .filter((group) => group.codes.length)
}
