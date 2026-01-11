import{post} from"../utils/request"

export const bookroom = async (options) =>{
    const result = await post("book-rooom",options);
    return result;
}