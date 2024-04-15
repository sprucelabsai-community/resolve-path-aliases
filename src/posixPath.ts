import pathUtil from 'path'

export default function posixPath(path: string): string {
    return path.split(pathUtil.sep).join(pathUtil.posix.sep)
}
